import { database, initialize } from "../server/database";
await initialize(await database());
console.log("Account database schema is ready.");
