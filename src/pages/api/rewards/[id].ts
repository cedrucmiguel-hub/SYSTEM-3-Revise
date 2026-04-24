import { createNestProxyHandler } from "../../../server/nest-proxy";

export default createNestProxyHandler((req) => `/rewards/${encodeURIComponent(String(req.query.id || ""))}`);
