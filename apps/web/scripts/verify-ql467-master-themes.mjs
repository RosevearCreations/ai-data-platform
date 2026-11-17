import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import assert from "node:assert/strict";
const root=resolve(import.meta.dirname,"../../..");
const contract=JSON.parse(readFileSync(resolve(root,".github/rosevear-master-themes.v2.json"),"utf8"));
const component=readFileSync(resolve(root,"apps/web/components/master-theme-chooser467.tsx"),"utf8");
const css=readFileSync(resolve(root,"apps/web/app/master-instrument-shell.css"),"utf8");
assert.equal(contract.schema,"rosevear.master-themes.v2");
assert.equal(contract.presentationOnly,true);
assert.equal(contract.authorityTransfer,false);
assert.deepEqual(contract.themeIds,["instrument","nebula","meadow","high-contrast","copper","arctic","solar","graphite","crimson","emerald","ultraviolet","steel"]);
for(const t of contract.themeIds){
 assert.ok(component.includes('"'+t+'"'));
 assert.ok(css.includes('data-rosevear-master-theme="'+t+'"'));
}
assert.equal(contract.build417Extension?.sharedThemeCount,12);
assert.equal(contract.build417Extension?.sameCatalogueForAllMasters,true);
console.log("QL467_AIDP_MASTER_THEME_PARITY=PASS; BUILD417_SHARED_THEME_COUNT=12");
