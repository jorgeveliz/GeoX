import React, { useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport, Environment, Line, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { Layer, LayerType, Drillhole, BlockModelBlock, TriangulationData, SelectedElement } from '../types';

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
}

// ---- Sub-components for 3D Objects ----

// Drillholes Rendering
const DrillholesGroup: React.FC<{
    visible: boolean,
    data: Drillhole[],
    lineWidth?: number,
    showID?: boolean,
    showDepth?: boolean,
    showSegments?: boolean,
    showValues?: boolean,
    onSelectElement?: (element: SelectedElement | null) => void;
    selectedElement?: SelectedElement | null;
}> = ({ visible, data, lineWidth = 25, showID = true, showDepth = true, showSegments = false, showValues = false, onSelectElement, selectedElement }) => {
    if (!visible || !data) {
        return null;
    }

    return (
        <group>
            {data.map((dh) => {
                return (
                    <group key={dh.id}>
                        {/* Label at collar */}
                        {(showID || showDepth) && (
                            <Billboard
                                position={[dh.x, dh.y + Math.max(5, lineWidth * 2) * 1.5 + 5, dh.z]}
                            >
                                <Text
                                    fontSize={Math.max(10, lineWidth * 0.6)}
                                    color="white"
                                    anchorX="center"
                                    anchorY="middle"
                                    outlineWidth={Math.max(1, lineWidth * 0.04)}
                                    outlineColor="black"
                                >
                                    {[
                                        showID ? dh.id : '',
                                        showDepth ? `${dh.depth.toFixed(1)}m` : ''
                                    ].filter(Boolean).join('\n')}
                                </Text>
                            </Billboard>
                        )}

                        {/* Render Segments (Cylinders) */}
                        {dh.segments.map((seg, idx) => {
                            // Calculate center, length and orientation
                            const start = new THREE.Vector3(...seg.start);
                            const end = new THREE.Vector3(...seg.end);
                            const direction = new THREE.Vector3().subVectors(end, start);
                            const length = direction.length();
                            const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

                            // Quaternion for rotation
                            const quaternion = new THREE.Quaternion();
                            const up = new THREE.Vector3(0, 1, 0); // Default cylinder orientation
                            quaternion.setFromUnitVectors(up, direction.normalize());

                            const isSelected = selectedElement &&
                                selectedElement.type === 'DRILLHOLE_SEGMENT' &&
                                selectedElement.id === `${dh.id}-${idx}`;

                            return (
                                <group key={`${dh.id}-${idx}`}>
                                    <mesh
                                        position={center}
                                        quaternion={quaternion}
                                        onPointerOver={(e) => {
                                            e.stopPropagation();
                                            document.body.style.cursor = 'pointer';
                                        }}
                                        onPointerOut={(e) => {
                                            e.stopPropagation();
                                            document.body.style.cursor = 'default';
                                        }}
                                        onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            console.log('╔═══════════════════════════════════════');
                                            console.log('║ DOUBLE CLICK DETECTED ON SEGMENT');
                                            console.log('╠═══════════════════════════════════════');
                                            console.log('║ Hole ID:', dh.id);
                                            console.log('║ Segment Index:', idx);
                                            console.log('║ From:', seg.from, 'm');
                                            console.log('║ To:', seg.to, 'm');
                                            console.log('║ Grade:', seg.grade, '%');
                                            console.log('╚═══════════════════════════════════════');
                                            if (onSelectElement) {
                                                onSelectElement({
                                                    type: 'DRILLHOLE_SEGMENT',
                                                    id: `${dh.id}-${idx}`,
                                                    holeId: dh.id,
                                                    from: seg.from,
                                                    to: seg.to,
                                                    value: seg.grade,
                                                    depth: (seg.from + seg.to) / 2, // Approximate depth of click
                                                    color: seg.color // Pass the segment's actual color
                                                });
                                            }
                                        }}
                                    >
                                        <cylinderGeometry args={[lineWidth, lineWidth, length, 16]} />
                                        <meshStandardMaterial color={seg.color} />
                                    </mesh>

                                    {/* Selection Highlight (Wireframe) */}
                                    {isSelected && (
                                        <mesh position={center} quaternion={quaternion}>
                                            <cylinderGeometry args={[lineWidth * 1.05, lineWidth * 1.05, length, 16, 1, true]} />
                                            <meshBasicMaterial color="yellow" wireframe={true} transparent opacity={0.8} />
                                        </mesh>
                                    )}

                                    {/* Segment "To" Label */}
                                    {showSegments && (
                                        <Billboard
                                            position={[end.x, end.y, end.z]}
                                        >
                                            <Text
                                                fontSize={Math.max(1.5, lineWidth * 0.15)}
                                                color="white"
                                                anchorX="left"
                                                anchorY="middle"
                                                position={[lineWidth * 1.8, 0, 0]} // Offset to the side
                                                outlineWidth={Math.max(0.1, lineWidth * 0.01)}
                                                outlineColor="black"
                                            >
                                                {seg.to}
                                            </Text>
                                        </Billboard>
                                    )}

                                    {/* Segment "Value" Label */}
                                    {showValues && (
                                        <Billboard
                                            position={[center.x, center.y, center.z]}
                                        >
                                            <Text
                                                fontSize={Math.max(1.5, lineWidth * 0.15)}
                                                color="white"
                                                anchorX="right"
                                                anchorY="middle"
                                                position={[-lineWidth * 1.8, 0, 0]} // Offset to the left side
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

                        {/* Collar marker */}
                        <mesh position={[dh.x, dh.y, dh.z]}>
                            <sphereGeometry args={[Math.max(5, lineWidth * 2), 32, 32]} />
                            <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.8} />
                        </mesh>

                        {/* Trace Line (visible line for continuity) */}
                        <Line
                            points={dh.trace}
                            color="cyan"
                            lineWidth={lineWidth * 0.5}
                            opacity={0.8}
                            transparent
                        />
                    </group>
                );
            })}
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

// Auto-center helper
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
}> = ({ renderables, zoomExtendTrigger, drillholeLineWidth, showDrillholeID, showDrillholeDepth, showDrillholeSegments, showDrillholeValues, enableDamping = true, onSelectElement, selectedElement }) => {
    const { camera, controls } = useThree();
    const groupRef = React.useRef<THREE.Group>(null);

    React.useEffect(() => {
        if (groupRef.current && groupRef.current.children.length > 0) {
            const box = new THREE.Box3().setFromObject(groupRef.current);
            if (!box.isEmpty()) {
                const center = new THREE.Vector3();
                box.getCenter(center);
                const size = new THREE.Vector3();
                box.getSize(size);

                const maxDim = Math.max(size.x, size.y, size.z);
                const distance = maxDim * 2;

                const angle = Math.PI / 4;
                camera.position.set(
                    center.x + distance * Math.cos(angle),
                    center.y + distance * 0.8,
                    center.z + distance * Math.sin(angle)
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
        }
    }, [renderables.length, zoomExtendTrigger]);

    return (
        <group ref={groupRef}>
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
    selectedElement
}) => {
    const renderables = useMemo(() => getRenderableLayers(layers), [layers]);

    return (
        <div className="w-full h-full bg-[#1e293b] relative">
            {/* Data Info Display */}
            <div className="absolute top-4 right-4 z-50 bg-black/80 text-white p-3 rounded text-xs font-mono">
                <div>Layers: {layers.length}</div>
                <div>Line Width: {drillholeLineWidth}</div>
                <div>ID: {showDrillholeID ? 'ON' : 'OFF'}</div>
                <div>Depth: {showDrillholeDepth ? 'ON' : 'OFF'}</div>
            </div>

            <Canvas shadows camera={{ position: [409500, 2000, 7497000], fov: 45, near: 1, far: 100000000 }}>
                <mesh position={[409500, 1600, 7496500]}>
                    <sphereGeometry args={[200, 32, 32]} />
                    <meshStandardMaterial color="red" emissive="red" emissiveIntensity={1} />
                </mesh>
                <axesHelper args={[2000]} />

                <ambientLight intensity={0.8} />
                <directionalLight position={[410000, 3000, 7497000]} intensity={1.5} castShadow />
                <directionalLight position={[409000, 1000, 7496000]} intensity={0.5} />

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
                />

                <OrbitControls
                    makeDefault
                    enableDamping={enableDamping}
                    dampingFactor={0.05}
                    screenSpacePanning={true} // Allow panning in screen space (up/down/left/right)
                    minDistance={100}
                    maxDistance={50000}
                    zoomSpeed={-1} // Invert zoom direction
                    mouseButtons={{
                        LEFT: THREE.MOUSE.ROTATE,
                        MIDDLE: THREE.MOUSE.PAN,
                        RIGHT: THREE.MOUSE.PAN // Optional: Keep right click as pan too, or make it something else
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