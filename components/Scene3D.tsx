import React, { useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, Environment, Line, Text, Billboard, Box } from '@react-three/drei';
import * as THREE from 'three';
import { Layer, LayerType, Drillhole, BlockModelBlock, TriangulationData, SelectedElement, DrillholeSegment, DrillholeFilter, SliceConfig } from '../types';

interface Scene3DProps {
    layers: Layer[];
    zoomExtendTrigger?: number;
    drillholeLineWidth?: number;
    showDrillholeID?: boolean;
    showDrillholeDepth?: boolean;
    showDrillholeSegments?: boolean;
    showDrillholeValues?: boolean;
    enableDamping?: boolean;
    onSelectElement?: (element: SelectedElement | null) => void;
    selectedElement?: SelectedElement | null;
    drillholeFilter?: DrillholeFilter;
    sliceConfig?: SliceConfig;
    onSlicePointsDefined?: (p1: [number, number, number], p2: [number, number, number]) => void;
}

// ---- Sub-components for 3D Objects ----

// Drillholes Rendering
const DrillholesGroup: React.FC<{
    visible: boolean;
    data: Drillhole[];
    lineWidth?: number;
    showID?: boolean;
    showDepth?: boolean;
    showSegments?: boolean;
    showValues?: boolean;
    onSelectElement?: (element: SelectedElement | null) => void;
    selectedElement?: SelectedElement | null;
}> = ({ visible, data, lineWidth = 25, showID = true, showDepth = true, showSegments = false, showValues = false, onSelectElement, selectedElement }) => {

    // Refs for InstancedMesh
    const meshRef = React.useRef<THREE.InstancedMesh>(null);
    const [totalSegments, setTotalSegments] = React.useState(0);

    // Flatten data for instances
    const flattenedSegments = useMemo(() => {
        if (!data) return [];
        const segments: { dhId: string, segIdx: number, seg: DrillholeSegment }[] = [];
        data.forEach(dh => {
            dh.segments.forEach((seg, idx) => {
                segments.push({ dhId: dh.id, segIdx: idx, seg: seg });
            });
        });
        return segments;
    }, [data]);

    React.useEffect(() => {
        setTotalSegments(flattenedSegments.length);
    }, [flattenedSegments]);

    // Update Instance Matrices
    React.useLayoutEffect(() => {
        if (!meshRef.current || totalSegments === 0) return;

        const tempObject = new THREE.Object3D();
        const color = new THREE.Color();

        flattenedSegments.forEach((item, i) => {
            const { seg } = item;

            const start = new THREE.Vector3(seg.start[0], seg.start[1], seg.start[2]);
            const end = new THREE.Vector3(seg.end[0], seg.end[1], seg.end[2]);
            const direction = new THREE.Vector3().subVectors(end, start);
            const length = direction.length();

            const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
            const quaternion = new THREE.Quaternion();
            if (length > 0) {
                const defaultUp = new THREE.Vector3(0, 1, 0);
                quaternion.setFromUnitVectors(defaultUp, direction.normalize());
            }

            tempObject.position.copy(center);
            tempObject.quaternion.copy(quaternion);
            tempObject.scale.set(lineWidth, length, lineWidth);
            tempObject.updateMatrix();

            meshRef.current!.setMatrixAt(i, tempObject.matrix);

            color.set(seg.color);
            meshRef.current!.setColorAt(i, color);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true;
        }

    }, [flattenedSegments, lineWidth, totalSegments, visible]);

    const handleClick = (e: any) => {
        e.stopPropagation();
        const instanceId = e.instanceId;
        if (instanceId !== undefined && flattenedSegments[instanceId] && onSelectElement) {
            const item = flattenedSegments[instanceId];

            // Calculate center for camera focus
            const start = new THREE.Vector3(item.seg.start[0], item.seg.start[1], item.seg.start[2]);
            const end = new THREE.Vector3(item.seg.end[0], item.seg.end[1], item.seg.end[2]);
            const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

            onSelectElement({
                type: 'DRILLHOLE_SEGMENT',
                id: `${item.dhId}___${item.segIdx}`,
                holeId: item.dhId,
                from: item.seg.from,
                to: item.seg.to,
                value: item.seg.grade,
                depth: (item.seg.from + item.seg.to) / 2,
                color: item.seg.color,
                // Add center for auto-focus
                x: center.x,
                y: center.y,
                z: center.z
            });
        }
    };

    if (!visible || !data) return null;

    return (
        <group>
            {/* Optimized Segment Instances */}
            {totalSegments > 0 && (
                <instancedMesh
                    key={`${totalSegments}-${visible}`}
                    ref={meshRef}
                    args={[undefined, undefined, totalSegments]}
                    onDoubleClick={handleClick}
                    onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
                    onPointerOut={(e) => { e.stopPropagation(); document.body.style.cursor = 'default'; }}
                >
                    <cylinderGeometry args={[1, 1, 1, 16]} />
                    <meshStandardMaterial />
                </instancedMesh>
            )}

            {/* Selection Highlight */}
            {selectedElement && selectedElement.type === 'DRILLHOLE_SEGMENT' && (() => {
                console.log('HIGHLIGHT: Attempting to render highlight for:', selectedElement.id);

                const [dhId, segIdxStr] = selectedElement.id.split('___');
                const segIdx = parseInt(segIdxStr);
                const dh = data.find(d => d.id === dhId);
                const seg = dh?.segments[segIdx];

                console.log('HIGHLIGHT: Found drillhole?', !!dh, 'Found segment?', !!seg);

                if (dh && seg) {
                    const start = new THREE.Vector3(seg.start[0], seg.start[1], seg.start[2]);
                    const end = new THREE.Vector3(seg.end[0], seg.end[1], seg.end[2]);
                    const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                    const direction = new THREE.Vector3().subVectors(end, start);
                    const length = direction.length();
                    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());

                    console.log('HIGHLIGHT: Rendering at position:', center, 'with radius:', lineWidth * 2);

                    return (
                        <mesh key={selectedElement.id} position={center} quaternion={quaternion}>
                            <cylinderGeometry args={[lineWidth * 1.5, lineWidth * 1.5, length, 16]} />
                            <meshBasicMaterial
                                color="yellow"
                                wireframe={true}
                                transparent={true}
                                opacity={0.8}
                            />
                        </mesh>
                    );
                }
                console.log('HIGHLIGHT: Could not render - drillhole or segment not found');
                return null;
            })()}

            {/* Non-Instanced Elements (Labels, Collars, Traces) */}
            {data.map(dh => (
                <group key={dh.id}>
                    {(showID || showDepth) && (
                        <Billboard position={[dh.x, dh.y + lineWidth * 2.5, dh.z]}>
                            <Text
                                fontSize={lineWidth * 1.2}
                                color="white"
                                anchorX="center"
                                anchorY="middle"
                                outlineWidth={lineWidth * 0.05}
                                outlineColor="black"
                            >
                                {[
                                    showID ? dh.id : '',
                                    showDepth ? `${dh.depth.toFixed(1)}m` : ''
                                ].filter(Boolean).join('\n')}
                            </Text>
                        </Billboard>
                    )}

                    <mesh position={[dh.x, dh.y, dh.z]}>
                        <sphereGeometry args={[lineWidth, 32, 32]} />
                        <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.8} />
                    </mesh>

                    <Line
                        points={dh.trace}
                        color="cyan"
                        lineWidth={lineWidth * 0.5}
                        opacity={0.8}
                        transparent
                    />

                    {(showSegments || showValues) && dh.segments.map((seg, idx) => {
                        const start = new THREE.Vector3(seg.start[0], seg.start[1], seg.start[2]);
                        const end = new THREE.Vector3(seg.end[0], seg.end[1], seg.end[2]);
                        const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                        return (
                            <group key={`${dh.id}-lbl-${idx}`}>
                                {showSegments && (
                                    <Billboard position={[center.x, center.y, center.z]}>
                                        <Text
                                            fontSize={Math.max(1.5, lineWidth * 0.15)}
                                            color="white"
                                            anchorX="right"
                                            anchorY="middle"
                                            position={[-lineWidth * 1.8, 0, 0]}
                                            outlineWidth={Math.max(0.1, lineWidth * 0.01)}
                                            outlineColor="black"
                                        >
                                            {seg.to}
                                        </Text>
                                    </Billboard>
                                )}
                                {showValues && (
                                    <Billboard position={[center.x, center.y, center.z]}>
                                        <Text
                                            fontSize={Math.max(1.5, lineWidth * 0.15)}
                                            color="white"
                                            anchorX="left"
                                            anchorY="middle"
                                            position={[lineWidth * 1.8, 0, 0]}
                                            outlineWidth={Math.max(0.1, lineWidth * 0.01)}
                                            outlineColor="black"
                                        >
                                            {seg.grade.toFixed(2)}
                                        </Text>
                                    </Billboard>
                                )}
                            </group>
                        )
                    })}
                </group>
            ))}
        </group>
    );
};

// Surface / Mesh Rendering (Pit Shell or Triangulation)
const SurfaceLayer: React.FC<{ visible: boolean, color?: string, opacity?: number, type: string, data?: any }> = ({ visible, color, opacity, type, data }) => {
    if (!visible) return null;

    // If data is TriangulationData, render lines and polylines
    if (data && (data as TriangulationData).lines !== undefined) {
        const triangulationData = data as TriangulationData;
        return (
            <group>
                {/* Render lines */}
                {triangulationData.lines.map((line) => (
                    <Line
                        key={line.id}
                        points={[line.start, line.end]}
                        color={color || line.color || '#00ff00'}
                        lineWidth={2}
                    />
                ))}
                {/* Render polylines */}
                {triangulationData.polylines.map((polyline) => {
                    const points = polyline.closed && polyline.points.length > 0
                        ? [...polyline.points, polyline.points[0]]
                        : polyline.points;
                    return (
                        <Line
                            key={polyline.id}
                            points={points}
                            color={color || polyline.color || '#00ff00'}
                            lineWidth={2}
                        />
                    );
                })}
            </group>
        );
    }

    // Procedural terrain/pit geometry (fallback)
    const geometry = useMemo(() => {
        // Create a bowl shape
        const geo = new THREE.PlaneGeometry(300, 300, 64, 64);
        const posAttribute = geo.attributes.position;
        const vertex = new THREE.Vector3();

        for (let i = 0; i < posAttribute.count; i++) {
            vertex.fromBufferAttribute(posAttribute, i);
            const dist = Math.sqrt(vertex.x * vertex.x + vertex.y * vertex.y);

            // Pit shape formula
            let z = 100;
            if (dist < 100) {
                z = (dist / 100) * 80; // Dip down
            } else {
                z = 80 + (Math.random() * 5); // Rough terrain outside
            }

            // Apply to Z (which is Y in ThreeJS when rotated)
            posAttribute.setZ(i, -z + 100);
        }
        geo.computeVertexNormals();
        return geo;
    }, []);

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -20, 0]} receiveShadow castShadow>
            <primitive object={geometry} />
            <meshStandardMaterial
                color={color || '#888'}
                side={THREE.DoubleSide}
                transparent
                opacity={opacity || 1}
                wireframe={false}
                roughness={0.8}
            />
        </mesh>
    );
};

// Solid Rendering (DXF 3DFACE entities)
const SolidLayer: React.FC<{
    visible: boolean;
    data: any; // SolidData
    color?: string;
    opacity?: number;
}> = ({ visible, data, color, opacity }) => {
    const geometry = useMemo(() => {
        if (!data || !data.vertices) return null;

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(data.vertices, 3));
        geom.computeVertexNormals();
        return geom;
    }, [data]);

    if (!visible || !geometry) return null;

    return (
        <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial
                color={color || '#ff8800'}
                side={THREE.DoubleSide}
                transparent
                opacity={opacity ?? 0.8}
                roughness={0.6}
                metalness={0.2}
            />
        </mesh>
    );
};

// Block Model Rendering (InstancedMesh for performance)
const BlockModelLayer: React.FC<{ visible: boolean, data: BlockModelBlock[] }> = ({ visible, data }) => {
    if (!visible || !data) return null;

    // Use instances for blocks
    const meshRef = React.useRef<THREE.InstancedMesh>(null);
    const colorArray = useMemo(() => {
        const c = new Float32Array(data.length * 3);
        const _color = new THREE.Color();
        for (let i = 0; i < data.length; i++) {
            _color.set(data[i].color);
            c[i * 3] = _color.r;
            c[i * 3 + 1] = _color.g;
            c[i * 3 + 2] = _color.b;
        }
        return c;
    }, [data]);

    React.useLayoutEffect(() => {
        if (!meshRef.current) return;
        const tempObj = new THREE.Object3D();
        for (let i = 0; i < data.length; i++) {
            tempObj.position.set(data[i].position[0], data[i].position[1], data[i].position[2]);
            tempObj.updateMatrix();
            meshRef.current.setMatrixAt(i, tempObj.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [data]);

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, data.length]}>
            <boxGeometry args={[18, 18, 18]} />
            <meshStandardMaterial vertexColors />
            <instancedBufferAttribute attach="instanceColor" args={[colorArray, 3]} />
        </instancedMesh>
    )
}


// ---- Main Scene Component ----

// Helper function moved outside
const getRenderableLayers = (layers: Layer[]): Layer[] => {
    let result: Layer[] = [];
    for (const l of layers) {
        if (l.children) {
            result = [...result, ...getRenderableLayers(l.children)];
        } else {
            result.push(l);
        }
    }
    return result;
};

// Helper function to calculate precise bounds from data
const calculateBounds = (layers: Layer[]): THREE.Box3 => {
    const box = new THREE.Box3();
    let isEmpty = true;

    layers.forEach(layer => {
        if (!layer.visible) return;

        if (layer.type === LayerType.DRILLHOLE_TRACE && layer.data) {
            const drillholes = layer.data as Drillhole[];
            drillholes.forEach(dh => {
                // Use trace for bounds as it covers the full path
                dh.trace.forEach(point => {
                    box.expandByPoint(new THREE.Vector3(point[0], point[1], point[2]));
                    isEmpty = false;
                });
            });
        }
        else if (layer.type === LayerType.SOLID && layer.data) {
            // Use pre-computed bounds if available
            const solidData = layer.data as any; // Cast to access custom props if needed
            if (solidData.bounds) {
                box.expandByPoint(new THREE.Vector3(solidData.bounds.min.x, solidData.bounds.min.y, solidData.bounds.min.z));
                box.expandByPoint(new THREE.Vector3(solidData.bounds.max.x, solidData.bounds.max.y, solidData.bounds.max.z));
                isEmpty = false;
            } else if (solidData.vertices) {
                // Fallback: iterate vertices (expensive but accurate)
                for (let i = 0; i < solidData.vertices.length; i += 3) {
                    box.expandByPoint(new THREE.Vector3(
                        solidData.vertices[i],
                        solidData.vertices[i + 1],
                        solidData.vertices[i + 2]
                    ));
                    isEmpty = false;
                }
            }
        }
        else if (layer.type === LayerType.BLOCK_MODEL && layer.data) {
            const blocks = layer.data as BlockModelBlock[];
            blocks.forEach(block => {
                // Approximate block size (assuming 10x10x10 or similar, could simply use center)
                // Using center is usually enough for camera framing
                box.expandByPoint(new THREE.Vector3(block.position[0], block.position[1], block.position[2]));
                isEmpty = false;
            });
        }
        else if (layer.type === LayerType.SURFACE && layer.data) {
            if ((layer.data as TriangulationData).lines) {
                const data = layer.data as TriangulationData;
                data.lines.forEach(l => {
                    box.expandByPoint(new THREE.Vector3(l.start[0], l.start[1], l.start[2]));
                    box.expandByPoint(new THREE.Vector3(l.end[0], l.end[1], l.end[2]));
                    isEmpty = false;
                });
                data.polylines.forEach(pl => {
                    pl.points.forEach(p => {
                        box.expandByPoint(new THREE.Vector3(p[0], p[1], p[2]));
                        isEmpty = false;
                    });
                });
            }
        }
    });

    return isEmpty ? new THREE.Box3() : box;
};

const SceneContent: React.FC<{
    renderables: Layer[];
    zoomExtendTrigger: number;
    drillholeLineWidth: number;
    showDrillholeID: boolean;
    showDrillholeDepth: boolean;
    showDrillholeSegments?: boolean;
    showDrillholeValues?: boolean;
    enableDamping?: boolean;
    onSelectElement?: (element: SelectedElement | null) => void;
    selectedElement?: SelectedElement | null;
    drillholeFilter?: DrillholeFilter;
    hasCentered: boolean;
    onCentered: () => void;
    sliceConfig?: SliceConfig;
    onSlicePointsDefined?: (p1: [number, number, number], p2: [number, number, number]) => void;
    onPointClick?: (point: THREE.Vector3) => void;
}> = ({ renderables, zoomExtendTrigger, drillholeLineWidth, showDrillholeID, showDrillholeDepth, showDrillholeSegments, showDrillholeValues, enableDamping = true, onSelectElement, selectedElement, drillholeFilter, hasCentered, onCentered, sliceConfig, onSlicePointsDefined, onPointClick }) => {
    const { camera, controls, gl, scene } = useThree();

    // ---- SLICING LOGIC ----
    const [drawStart, setDrawStart] = React.useState<THREE.Vector3 | null>(null);
    const [drawEnd, setDrawEnd] = React.useState<THREE.Vector3 | null>(null);
    const [rotationCenter, setRotationCenter] = React.useState<THREE.Vector3 | null>(null);

    // Effect to handle clipping planes
    React.useEffect(() => {
        if (!sliceConfig?.active || !sliceConfig.p1 || !sliceConfig.p2) {
            gl.clippingPlanes = [];
            gl.localClippingEnabled = false; // Or true if other things use it, but globally we usually disable
            return;
        }

        const p1 = new THREE.Vector3(...sliceConfig.p1);
        const p2 = new THREE.Vector3(...sliceConfig.p2);

        // Calculate center and normal
        const center = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
        const lineDir = new THREE.Vector3().subVectors(p2, p1).normalize();
        const normal = new THREE.Vector3(0, 1, 0).cross(lineDir).normalize();

        // Apply Offset
        const currentCenter = center.clone().add(normal.clone().multiplyScalar(sliceConfig.offset));

        // Create Planes
        // Plane 1: Normal pointing towards center. 
        // Constant d is distance from origin. Plane equation: Ax + By + Cz + D = 0.
        // D = -dot(Normal, PointOnPlane)

        const halfWidth = sliceConfig.width / 2;

        // Front Plane (Positive Normal direction)
        const frontNormal = normal.clone().negate(); // Pointing IN to the slice
        const frontPoint = currentCenter.clone().add(normal.clone().multiplyScalar(halfWidth));
        const frontPlane = new THREE.Plane(frontNormal, -frontNormal.dot(frontPoint));

        // Back Plane (Negative Normal direction)
        const backNormal = normal.clone(); // Pointing IN to the slice
        const backPoint = currentCenter.clone().add(normal.clone().multiplyScalar(-halfWidth));
        const backPlane = new THREE.Plane(backNormal, -backNormal.dot(backPoint));

        gl.clippingPlanes = [frontPlane, backPlane];
        gl.localClippingEnabled = true;

        return () => {
            gl.clippingPlanes = [];
            gl.localClippingEnabled = false;
        };
    }, [sliceConfig, gl]);


    // Interaction handler for drawing slice
    const handleSlicePointerDown = (e: any) => {
        if (!sliceConfig?.active || (sliceConfig.p1 && sliceConfig.p2)) return; // Already defined or not active

        // Only trigger if clicking on "nothing" or specific plane? 
        // For now, let's assume we allow clicking anywhere on the grid/plane
        // We need the point on the XZ plane (y=0 usually or current intersection)

        // If we want to draw on the grid, we might need a dedicated invisible plane 
        // OR just use the intersection point from the event if it hit the 'ground' or an object

        // Let's force Y=0 for the slice definition for simplicity now, 
        // unless we hit an object, then we take that point's X,Z and Y=0? 
        // Or better yet, raycast to a virtual Y=average plane.

        // Simple approach: Use the point where the user clicked.
        const point = e.point.clone();

        if (!drawStart) {
            setDrawStart(point);
            console.log('Slice Start:', point);
        } else {
            setDrawEnd(point);
            console.log('Slice End:', point);
            if (onSlicePointsDefined) {
                onSlicePointsDefined([drawStart.x, drawStart.y, drawStart.z], [point.x, point.y, point.z]);
            }
            // Reset local draw state as it's now managed by App's sliceConfig
            setDrawStart(null);
            setDrawEnd(null);
        }
    };



    // VISUAL FEEDBACK FOR SLICE
    const sliceFeedback = useMemo(() => {
        if (sliceConfig?.active && sliceConfig.p1 && sliceConfig.p2) {
            const p1 = new THREE.Vector3(...sliceConfig.p1);
            const p2 = new THREE.Vector3(...sliceConfig.p2);

            // Visualizing the slice bounds
            const center = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
            const lineDir = new THREE.Vector3().subVectors(p2, p1).normalize();
            const normal = new THREE.Vector3(0, 1, 0).cross(lineDir).normalize();

            const currentCenter = center.clone().add(normal.clone().multiplyScalar(sliceConfig.offset));

            // Box dimensions
            const length = p1.distanceTo(p2);
            const width = sliceConfig.width;
            const height = 2000; // Arbitrary high height

            // Rotation
            const angle = Math.atan2(lineDir.z, lineDir.x);

            return (
                <group position={currentCenter} rotation={[0, -angle, 0]}>
                    <Box args={[length, height, width]} visible={false}>
                        <meshBasicMaterial color="yellow" wireframe />
                    </Box>
                    {/* Bounding Box Wireframe */}
                    <Line
                        points={[
                            [-length / 2, -height / 2, -width / 2], [-length / 2, height / 2, -width / 2],
                            [length / 2, height / 2, -width / 2], [length / 2, -height / 2, -width / 2],
                            [-length / 2, -height / 2, -width / 2]
                        ]}
                        color="orange"
                        lineWidth={2}
                    />
                    <Line
                        points={[
                            [-length / 2, -height / 2, width / 2], [-length / 2, height / 2, width / 2],
                            [length / 2, height / 2, width / 2], [length / 2, -height / 2, width / 2],
                            [-length / 2, -height / 2, width / 2]
                        ]}
                        color="orange"
                        lineWidth={2}
                    />
                    {/* Connectors */}
                    <Line
                        points={[[-length / 2, 0, -width / 2], [-length / 2, 0, width / 2]]}
                        color="orange"
                        lineWidth={2}
                    />
                    <Line
                        points={[[length / 2, 0, -width / 2], [length / 2, 0, width / 2]]}
                        color="orange"
                        lineWidth={2}
                    />
                </group>
            )
        }

        if (drawStart && !drawEnd) {
            // Drawing line
            // We need a way to track mouse path for real-time line, but for now just a point
            return (
                <mesh position={drawStart}>
                    <sphereGeometry args={[5]} />
                    <meshBasicMaterial color="red" />
                </mesh>
            )
        }
        return null;
    }, [sliceConfig, drawStart, drawEnd]);


    // Auto-center function
    const autoCenter = React.useCallback(() => {
        // If filtering is active, prioritize drillhole bounds
        const layersToCheck = (drillholeFilter)
            ? renderables.filter(l => l.type === LayerType.DRILLHOLE_TRACE && l.visible)
            : renderables;

        let box = calculateBounds(layersToCheck);

        // Fallback: If filtered bounds are empty (e.g. no drillholes match, or strict filter), 
        // try focusing on everything visible to avoid getting lost
        if (box.isEmpty() && drillholeFilter) {
            box = calculateBounds(renderables);
        }

        if (!box.isEmpty()) {
            const center = new THREE.Vector3();
            box.getCenter(center);
            const size = new THREE.Vector3();
            box.getSize(size);

            const maxDim = Math.max(size.x, size.y, size.z);
            // Dynamic distance based on bounding box size
            const distance = maxDim * 1.5;

            // Smoothly move camera using OrbitControls if possible, or just jump
            camera.position.set(
                center.x + distance,
                center.y + distance * 0.8,
                center.z + distance
            );
            camera.lookAt(center);
            camera.updateProjectionMatrix();

            if (controls) {
                // @ts-ignore
                controls.target.copy(center);
                // @ts-ignore
                controls.update();
            }
        }
    }, [camera, controls, renderables, drillholeFilter]); // Added drillholeFilter dependency

    // Auto-center when zoom extend is triggered
    React.useEffect(() => {
        if (zoomExtendTrigger > 0) {
            autoCenter();
        }
    }, [zoomExtendTrigger, autoCenter]);

    // Enhanced Auto-center: Trigger when data content significantly changes (like filtering)
    // We use a simplified signature of the data to avoid deep comparison cost
    // We sum the length of data arrays as a proxy for "content changed"
    const dataSignature = useMemo(() => {
        return renderables.reduce((acc, layer) => {
            if (!layer.visible) return acc;
            if (Array.isArray(layer.data)) return acc + layer.data.length;
            // For solids, maybe use vertex count if available?
            return acc + (layer.data?.vertices?.length || 0);
        }, 0);
    }, [renderables]);

    React.useEffect(() => {
        // Debounce to avoid double-firing on initial load
        const timer = setTimeout(() => {
            // Only auto-center if we haven't done it yet and there is data
            if (!hasCentered && dataSignature > 0) {
                console.log('Triggering initial auto-center (Signature:', dataSignature, ')');
                autoCenter();
                onCentered();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [dataSignature, autoCenter, hasCentered, onCentered]); // Trigger on signature change (filtering changes length)

    const handlePointerDown = (e: any) => {
        if (sliceConfig?.active && !sliceConfig.p1) {
            e.stopPropagation(); // Consume event if drawing slice
            handleSlicePointerDown(e);
            return;
        }

        // Alt + Click to set rotation center
        if (e.altKey) {
            e.stopPropagation();
            console.log('Setting rotation center to:', e.point);

            if (controls) {
                // @ts-ignore
                controls.target.copy(e.point);
                // @ts-ignore
                controls.update();
            }
            setRotationCenter(e.point.clone());
        }

        // Generic click for coordinates
        if (onPointClick) {
            onPointClick(e.point.clone());
        }
    };

    return (
        <group onPointerDown={handlePointerDown}>
            {/* Slice Visual Feedback */}
            {sliceFeedback}

            {/* Draw Line Feedback (Realtime?) - Hard without continuous pointer move, 
                but we can at least show the start point */}

            {/* Rotation Center Marker */}
            {rotationCenter && (
                <mesh position={rotationCenter}>
                    <sphereGeometry args={[2, 16, 16]} />
                    <meshBasicMaterial color="#ff0000" transparent opacity={0.5} depthTest={false} />
                </mesh>
            )}

            {renderables.map(layer => {
                if (layer.type === LayerType.DRILLHOLE_TRACE) {
                    return <DrillholesGroup
                        key={layer.id}
                        visible={layer.visible}
                        data={layer.data as Drillhole[]}
                        lineWidth={drillholeLineWidth}
                        showID={showDrillholeID}
                        showDepth={showDrillholeDepth}
                        showSegments={showDrillholeSegments}
                        showValues={showDrillholeValues}
                        onSelectElement={onSelectElement}
                        selectedElement={selectedElement}
                    />
                }
                if (layer.type === LayerType.SURFACE) {
                    return <SurfaceLayer key={layer.id} visible={layer.visible} color={layer.color} opacity={layer.opacity} type={layer.name} data={layer.data} />
                }
                if (layer.type === LayerType.BLOCK_MODEL) {
                    return <BlockModelLayer key={layer.id} visible={layer.visible} data={layer.data as BlockModelBlock[]} />
                }
                if (layer.type === LayerType.SOLID) {
                    return <SolidLayer key={layer.id} visible={layer.visible} data={layer.data} color={layer.color} opacity={layer.opacity} />
                }
                return null;
            })}
        </group>
    );
};

const Scene3D: React.FC<Scene3DProps> = ({
    layers,
    zoomExtendTrigger = 0,
    drillholeLineWidth = 25,
    showDrillholeID = true,
    showDrillholeDepth = true,
    showDrillholeSegments = false,
    showDrillholeValues = false,
    enableDamping = true,
    onSelectElement,
    selectedElement,
    drillholeFilter,
    sliceConfig,
    onSlicePointsDefined,
    onPointClick
}) => {
    // Filter drillholes based on filter criteria (recursive)
    const filteredLayers = useMemo(() => {
        if (!drillholeFilter) return layers;

        console.log('Applying drillhole filter:', drillholeFilter);

        const filterLayer = (layer: Layer): Layer => {
            // If this is a drillhole trace layer, filter its data
            if (layer.type === LayerType.DRILLHOLE_TRACE && layer.data) {
                const filteredData = (layer.data as Drillhole[]).filter(dh => {
                    // Date range filter
                    if (drillholeFilter.dateRange) {
                        if (!dh.endDate) return false;
                        const dhDate = new Date(dh.endDate);
                        if (drillholeFilter.dateRange.start && dhDate < new Date(drillholeFilter.dateRange.start)) return false;
                        if (drillholeFilter.dateRange.end && dhDate > new Date(drillholeFilter.dateRange.end)) return false;
                    }

                    // Project name filter
                    if (drillholeFilter.projectNames && drillholeFilter.projectNames.length > 0) {
                        if (!dh.projectName) return false;
                        if (!drillholeFilter.projectNames.includes(dh.projectName)) return false;
                    }

                    // Drillhole ID filter
                    if (drillholeFilter.drillholeIds && drillholeFilter.drillholeIds.length > 0) {
                        if (!drillholeFilter.drillholeIds.includes(dh.id)) return false;
                    }

                    return true;
                });

                console.log(`Filtered layer ${layer.name}: ${(layer.data as Drillhole[]).length} -> ${filteredData.length} drillholes`);
                return { ...layer, data: filteredData };
            }

            // If this is a folder, recursively filter its children
            if (layer.children && layer.children.length > 0) {
                return {
                    ...layer,
                    children: layer.children.map(child => filterLayer(child))
                };
            }

            return layer;
        };

        return layers.map(layer => filterLayer(layer));
    }, [layers, drillholeFilter]);

    const renderables = useMemo(() => getRenderableLayers(filteredLayers), [filteredLayers]);

    const [hasCentered, setHasCentered] = React.useState(false);

    return (
        <div className="w-full h-full bg-[#1e293b] relative">


            <Canvas shadows camera={{ position: [0, 0, 1000], fov: 45, near: 0.01, far: 100000000 }}>
                {/* Axes Helper at origin */}
                <axesHelper args={[2000]} />

                <ambientLight intensity={0.8} />
                {/* Light attached to camera or scene? Better to put it high up */}
                <directionalLight position={[0, 10000, 0]} intensity={1.5} castShadow />
                <directionalLight position={[10000, 5000, 5000]} intensity={0.5} />

                <SceneContent
                    renderables={renderables}
                    zoomExtendTrigger={zoomExtendTrigger}
                    drillholeLineWidth={drillholeLineWidth}
                    showDrillholeID={showDrillholeID}
                    showDrillholeDepth={showDrillholeDepth}
                    showDrillholeSegments={showDrillholeSegments}
                    showDrillholeValues={showDrillholeValues}
                    enableDamping={enableDamping}
                    onSelectElement={onSelectElement}
                    selectedElement={selectedElement}
                    drillholeFilter={drillholeFilter}
                    hasCentered={hasCentered}
                    onCentered={() => setHasCentered(true)}
                    sliceConfig={sliceConfig}
                    onSlicePointsDefined={onSlicePointsDefined}
                    onPointClick={onPointClick}
                />

                <OrbitControls
                    makeDefault
                    enableDamping={enableDamping}
                    dampingFactor={0.1}
                    screenSpacePanning={true}
                    minDistance={0}
                    maxDistance={100000000}
                    zoomSpeed={1.5}
                    zoomToCursor={true}
                    enablePan={true}
                    enableRotate={true}
                    enableZoom={true}
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI}
                    mouseButtons={{
                        LEFT: THREE.MOUSE.ROTATE,
                        MIDDLE: THREE.MOUSE.PAN,
                        RIGHT: THREE.MOUSE.PAN
                    }}
                />

                <GizmoHelper alignment="bottom-left" margin={[80, 80]}>
                    <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="white" />
                </GizmoHelper>
            </Canvas>
        </div>
    );
};

export default Scene3D;