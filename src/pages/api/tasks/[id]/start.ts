import { createNestProxyHandler } from "../../../../server/nest-proxy";

export default createNestProxyHandler((req) => `/tasks/${encodeURIComponent(String(req.query.id || ""))}/start`);
