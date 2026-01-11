const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
    constructor(dbPath) {
        // Use provided path or default to user data directory
        this.dbPath = dbPath || path.join(process.cwd(), 'geox.db');

        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better performance
        this.db.pragma('synchronous = NORMAL'); // Faster writes
        this.db.pragma('cache_size = -64000'); // 64MB cache

        this.initSchema();
    }

    initSchema() {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf-8');
        this.db.exec(schema);
    }

    // Batch insert for collars
    insertCollars(collars) {
        const insert = this.db.prepare(`
      INSERT OR REPLACE INTO collars (hole_id, east, north, rl, depth, end_date, prospect_name)
      VALUES (@hole_id, @east, @north, @rl, @depth, @end_date, @prospect_name)
    `);

        const insertMany = this.db.transaction((collars) => {
            for (const collar of collars) {
                insert.run(collar);
            }
        });

        insertMany(collars);
    }

    // Batch insert for surveys
    insertSurveys(surveys) {
        const insert = this.db.prepare(`
      INSERT INTO surveys (hole_id, depth, azimuth, dip)
      VALUES (@hole_id, @depth, @azimuth, @dip)
    `);

        const insertMany = this.db.transaction((surveys) => {
            for (const survey of surveys) {
                insert.run(survey);
            }
        });

        insertMany(surveys);
    }

    // Batch insert for assays
    insertAssays(assays) {
        const insert = this.db.prepare(`
      INSERT INTO assays (hole_id, from_depth, to_depth, grade, element)
      VALUES (@hole_id, @from_depth, @to_depth, @grade, @element)
    `);

        const insertMany = this.db.transaction((assays) => {
            for (const assay of assays) {
                insert.run(assay);
            }
        });

        insertMany(assays);
    }

    // Query with pagination
    getCollars(limit = 1000, offset = 0) {
        return this.db.prepare(`
      SELECT * FROM collars
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    }

    // Get all hole IDs
    getAllHoleIds() {
        return this.db.prepare('SELECT hole_id FROM collars ORDER BY hole_id').all();
    }

    // Get drillhole data
    getDrillholeData(holeId) {
        const collar = this.db.prepare('SELECT * FROM collars WHERE hole_id = ?').get(holeId);
        const surveys = this.db.prepare('SELECT * FROM surveys WHERE hole_id = ? ORDER BY depth').all(holeId);
        const assays = this.db.prepare('SELECT * FROM assays WHERE hole_id = ? ORDER BY from_depth').all(holeId);

        return { collar, surveys, assays };
    }

    // Get statistics
    getStats() {
        const collarCount = this.db.prepare('SELECT COUNT(*) as count FROM collars').get();
        const surveyCount = this.db.prepare('SELECT COUNT(*) as count FROM surveys').get();
        const assayCount = this.db.prepare('SELECT COUNT(*) as count FROM assays').get();

        return {
            collars: collarCount.count,
            surveys: surveyCount.count,
            assays: assayCount.count
        };
    }

    // Get all data for initial load
    getAllData() {
        const collars = this.db.prepare('SELECT * FROM collars').all();
        const surveys = this.db.prepare('SELECT * FROM surveys ORDER BY hole_id, depth').all();
        const assays = this.db.prepare('SELECT * FROM assays ORDER BY hole_id, from_depth').all();

        return { collars, surveys, assays };
    }

    // Clear all data
    clearAll() {
        this.db.exec('DELETE FROM coordinates');
        this.db.exec('DELETE FROM assays');
        this.db.exec('DELETE FROM surveys');
        this.db.exec('DELETE FROM collars');
    }

    close() {
        this.db.close();
    }
}

module.exports = DatabaseManager;
