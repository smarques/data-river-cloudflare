/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
const dblib = require('./lib/db');
const stats = require('./lib/stats');
const ingestor = require('./lib/ingestion');
const KEY = '2ottd6QjYmko7YuQbGSzuxeD22i2uUJRxHNf2dvN';
export interface Env {
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
	//
	// Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
	// MY_SERVICE: Fetcher;
	//
	// Example binding to a Queue. Learn more at https://developers.cloudflare.com/queues/javascript-apis/
	// MY_QUEUE: Queue;

	DB: any;
}

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
	'Access-Control-Max-Age': '86400',
};
function handleOptions(request) {
	// Make sure the necessary headers are present
	// for this to be a valid pre-flight request
	let headers = request.headers;
	if (
		headers.get('Origin') !== null &&
		headers.get('Access-Control-Request-Method') !== null &&
		headers.get('Access-Control-Request-Headers') !== null
	) {
		// Handle CORS pre-flight request.
		// If you want to check or reject the requested method + headers
		// you can do that here.
		let respHeaders = {
			...corsHeaders,
			// Allow all future content Request headers to go back to browser
			// such as Authorization (Bearer) or X-Client-Name-Version
			'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers'),
		};
		return new Response(null, {
			headers: respHeaders,
		});
	} else {
		// Handle standard OPTIONS request.
		// If you want to allow other HTTP Methods, you can do that here.
		return new Response(null, {
			headers: {
				Allow: 'GET, HEAD, POST, OPTIONS',
			},
		});
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		dblib.setDb(env.DB);
		const { pathname } = new URL(request.url);
		const methods = {
			POST: 'POST',
			GET: 'GET',
		};
		const method = request.method;
		if (request.method === 'OPTIONS') {
			return handleOptions(request);
		}
		// if (pathname === '/init' && method === methods.POST) {
		// 	await dblib.init();
		// 	return new Response('Db initialized');
		// 	// If you did not use `DB` as your binding name, change it here
		// 	// const { results } = await env.DB.prepare('SELECT * FROM Customers WHERE CompanyName = ?').bind('Bs Beverages').all();
		// 	// return Response.json(results);
		// }
		// if (pathname === '/reset' && method === methods.POST) {
		// 	await dblib.reset();
		// 	return new Response('Db reset');
		// }
		if (pathname === '/ingest' && method === methods.POST) {
			const myHeaders = new Headers();
			myHeaders.append('Access-Control-Allow-Origin', '*');
			myHeaders.append('Content-Type', 'application/json');
			myHeaders.append('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

			const { records: data, apiKey } = await request.json();
			if (apiKey !== KEY) {
				return new Response(
					JSON.stringify({
						success: false,
						error: 'forbidden',
					}),
					{ status: 403 }
				);
			}
			if (!Array.isArray(data)) {
				return new Response(
					JSON.stringify({
						success: false,
						error: 'expecting JSON array [] of entries {}',
					}),
					{ status: 401 }
				);
			}
			for (const entry of data) {
				try {
					ingestor.validate(entry);
				} catch (error) {
					return new Response(
						JSON.stringify({
							success: false,
							error: error,
							entry,
							what: 0,
						}),
						{ status: 401 }
					);
				}
			}

			await dblib.reset();
			for (const entry of data) {
				try {
					await ingestor.ingest(entry);
				} catch (error) {
					return new Response(
						JSON.stringify({
							success: false,
							error: error,
							entry,
							what: 1,
						}),
						{ status: 401 }
					);
				}
			}

			return new Response(
				JSON.stringify({
					success: true,
					entries: data.length,
				})
			);
		}
		if (pathname === '/pull' && method === methods.GET) {
			const newRecord = await stats.getLatestAbsValues(null);
			const json = JSON.stringify({
				success: true,
				newRecord,
			});
			return new Response(json, {
				headers: {
					'content-type': 'application/json;charset=UTF-8',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
					'Access-Control-Max-Age': '86400',
				},
			});
			return res;
		}

		return new Response('Data River API');
	},
};
