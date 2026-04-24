import { createNestProxyHandler } from "../../../../../server/nest-proxy";

export default createNestProxyHandler((req) => `/partners/settlements/${encodeURIComponent(String(req.query.id || ""))}/paid`);
