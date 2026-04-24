import { createNestProxyHandler } from "../../../server/nest-proxy";

export default createNestProxyHandler((req) => `/campaigns/${encodeURIComponent(String(req.query.id || ""))}`);
