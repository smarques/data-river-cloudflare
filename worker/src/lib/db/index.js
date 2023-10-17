const sql_create = `CREATE TABLE IF NOT EXISTS Entries (
  position VARCHAR(100) NOT NULL,
  quality REAL NOT NULL,
  quantity REAL NOT NULL,
  date TEXT NOT NULL
);`;

const dblib = {};
dblib.db = {};
dblib.setDb = (db) => {
	this.db = db;
};
dblib.init = async () => {
	console.log('resetting db');
	console.log(sql_create);
	const stmt = this.db.prepare(sql_create);
	stmt.run();
};

dblib.reset = async () => {
	const stmt = this.db.prepare('DELETE FROM Entries');
	stmt.run();
};

dblib.hasTimeEntry = async (data) => {
	const stmt = this.db.prepare(
		`SELECT COUNT(*) as tot
    FROM Entries t1
    WHERE position= @pos AND t1.date = @dt`
	);
	const info = stmt.all({ pos: data.name, dt: data.dt });
	return info[0]['tot'] > 0;
};
dblib.insertRecord = async (data) => {
	console.log(Object.values(data));
	const stmt = this.db
		.prepare('INSERT INTO Entries (position, quality, quantity, date) VALUES (?1, ?4, ?2, ?3)')
		// stmt.bind(Object.values(data));
		.bind(...Object.values(data));
	try {
		await stmt.run();
	} catch (e) {
		console.error({
			message: e.message,
		});
	}
};
dblib.updateTimeEntry = async (data) => {
	const stmt = this.db.prepare('UPDATE Entries SET q = q + @increment WHERE position = @name AND date = @dt');
	return stmt.run({ increment: data.q, name: data.name, dt: data.dt });
};
dblib.reset = () => {
	const stmt = this.db.prepare('DELETE FROM Entries');
	const info = stmt.run();
};

dblib.getAverages = async () => {
	const stmt = this.db.prepare('SELECT position, AVG(q) as average FROM Entries GROUP BY position');
	const info = stmt.all();
	return info;
};

dblib.clearPos = async (pos) => {
	const stmt = this.db.prepare(
		`DELETE
    FROM Entries
    WHERE position = @position`
	);

	const info = stmt.run({ position: pos });
	return info;
};

dblib.getLatestData = async (dt) => {
	const flatHour = dt ? new Date(dt) : new Date();
	//flatHour.setMinutes(0, 0, 0);
	//console.log(flatHour.toISOString())
	//AND date >
	const stmt = this.db.prepare(
		`SELECT t1.*
    FROM Entries t1
    `
	); //WHERE t1.date <= @dt
	const info = stmt.all();
	return info;
};

dblib.getAllData = async () => {
	//AND date >
	const stmt = this.db.prepare(
		`SELECT t1.*
    FROM Entries t1`
	);
	const info = stmt.all();
	return info;
};

dblib.getLatestRecords = async (n = 100) => {
	if (n > 200) {
		n = 200;
	}
	const stmt = this.db.prepare(
		`SELECT t1.*
    FROM Entries t1
    ORDER BY t1.date DESC
    LIMIT @limit`
	);
	const info = stmt.all({ limit: n });
	return info;
};

dblib.clearOldEntries = async () => {
	const stmt = this.db.prepare(
		`DELETE
    FROM Entries
    WHERE date < date('now','-1 month')`
	);

	const info = stmt.run();
	return info;
	// return true;
};

module.exports = dblib;
