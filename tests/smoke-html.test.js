import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("index.html renders the form", () => {
  const html = fs.readFileSync(
    path.resolve(__dirname, "../public/index.html"),
    "utf8",
  );
  document.documentElement.innerHTML = html;
  expect(document.getElementById("generate-form")).not.toBeNull();
});
