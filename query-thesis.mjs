import { webdev_execute_sql } from '@manus/webdev';

const result = await webdev_execute_sql({
  brief: "Consultar última tese extraída",
  query: "SELECT id, thesis, legalFoundations, keywords, createdAt FROM learned_theses ORDER BY id DESC LIMIT 1"
});

console.log(JSON.stringify(result, null, 2));
