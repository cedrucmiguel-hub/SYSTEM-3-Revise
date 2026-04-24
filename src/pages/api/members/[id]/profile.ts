import { createNestProxyHandler } from "../../../../server/nest-proxy";

export default createNestProxyHandler((req) => `/members/${encodeURIComponent(String(req.query.id || ""))}/profile`);
