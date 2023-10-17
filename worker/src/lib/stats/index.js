const dblib = require('../db');
const stats = {};
const CAP_AVERAGE = 5;

stats.getAverages = async () => {
	return await dblib.getAverages();
};
stats.getLatestData = async (dt) => {
	return await dblib.getLatestData(dt);
};
stats.getLatestAbsValues = async (dt) => {
	const latest = await stats.getLatestData(dt);
	console.log(latest);
	if (!latest.results.length) return {};
	const latestByPosition = latest.results.reduce((prev, curr) => {
		prev[curr.position] = {
			quantity: curr.quantity,
			quality: curr.quality,
		};
		return prev;
	}, {});
	console.log(latestByPosition);
	return latestByPosition;
};
stats.getLatestNormalizedValues = async (dt) => {
	const avgs = await stats.getAverages();
	const latest = await stats.getLatestData(dt);
	// console.log(avgs,latest)
	const avgsByPosition = avgs.reduce((prev, curr) => {
		prev[curr.position] = curr.average;
		return prev;
	}, {});
	const latestByPosition = latest.reduce((prev, curr) => {
		prev[curr.position] = curr.q;
		return prev;
	}, {});
	const res = {};
	for (pos in avgsByPosition) {
		const normalizedChange = Math.round(((latestByPosition[pos] - avgsByPosition[pos]) * 100) / avgsByPosition[pos]) / 100;
		res[pos] = latestByPosition[pos] ? capChangePerc(normalizedChange) : 'null';
	}
	return res;
};

const capChangePerc = (changePerc) => {
	if (changePerc < -1 * CAP_AVERAGE) return -1 * CAP_AVERAGE;
	if (changePerc > CAP_AVERAGE) return CAP_AVERAGE;
	return changePerc;
};

module.exports = stats;
