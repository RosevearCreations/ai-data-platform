"use client";
import {useEffect,useState} from "react";
export const MASTER_THEME_IDS_467=[
 "instrument","nebula","meadow","high-contrast","copper","arctic","solar","graphite"
] as const;
export type MasterThemeId467=(typeof MASTER_THEME_IDS_467)[number];
const names:Record<MasterThemeId467,string>={
 instrument:"Master Instrument",nebula:"Nebula Purple",meadow:"Meadow",
 "high-contrast":"High Contrast",copper:"Copper Workshop",arctic:"Arctic Blue",
 solar:"Solar Gold",graphite:"Graphite Cyan"
};
const storage="rosevear-master-appearance-v2";
const valid=(s:unknown):s is MasterThemeId467=>typeof s==="string"&&
 (MASTER_THEME_IDS_467 as readonly string[]).includes(s);
export function MasterThemeChooser467(){
 const [selection,setSelection]=useState<MasterThemeId467>("instrument");
 useEffect(()=>{
  try{const existing=window.localStorage.getItem(storage);if(valid(existing))setSelection(existing)}
  catch{/* unavailable storage must not block display selection */}
 },[]);
 useEffect(()=>{
  document.documentElement.dataset.rosevearMasterTheme=selection;
  try{window.localStorage.setItem(storage,selection)}catch{/* presentation only */}
 },[selection]);
 return <div className="masterTheme467Chooser">
  <label htmlFor="master-theme-467">Master appearance</label>
  <select id="master-theme-467" value={selection}
    onChange={e=>{if(valid(e.target.value))setSelection(e.target.value)}}>
   {MASTER_THEME_IDS_467.map(id=><option key={id} value={id}>{names[id]}</option>)}
  </select>
  <small>Visual theme only · no service or security change</small>
 </div>;
}
