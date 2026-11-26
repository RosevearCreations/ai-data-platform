// Run on the actual original witness device only, with externally approved evidence and a local Ed25519 private key.
// The key never leaves the device. Output is a signed PUBLIC envelope, not a private key.
import {readFileSync} from "node:fs";
import {createPrivateKey,randomBytes,sign} from "node:crypto";
const args=new Map(process.argv.slice(2).map(x=>{
 const index=x.indexOf("=");
 if(!x.startsWith("--")||index<3)throw Error("expected --name=value arguments");
 return [x.slice(2,index),x.slice(index+1)];
}));
const required=["app-id","source-commit","key-id","witness-id","witness-role","original-device-id","private-key-file","review-evidence-file"];
for(const key of required)if(!args.get(key))throw Error("missing required argument: "+key);
const appIds=new Set(["ai-data-platform","rosevear-comms-hub","rosevear-ai-hub","icamp","yw","devilndove","rosiedazzlers"]);
const appId=args.get("app-id"),sourceCommit=args.get("source-commit"),originalDeviceId=args.get("original-device-id");
if(!appIds.has(appId))throw Error("invalid application");
if(!/^[a-f0-9]{40}$/.test(sourceCommit))throw Error("invalid source revision");
if(!/^[A-Za-z0-9_-]{2,100}$/.test(args.get("key-id")))throw Error("invalid key ID");
if(!/^[A-Za-z0-9_-]{2,100}$/.test(originalDeviceId))throw Error("invalid original device ID");
const review=JSON.parse(readFileSync(args.get("review-evidence-file"),"utf8"));
if(review?.appId!==appId||review?.sourceCommit!==sourceCommit||review?.originalDeviceId!==originalDeviceId||
 review?.interfaceCertified!==true||review?.receiverAckVerified!==true||
 review?.ownerAcceptanceVerified!==true||review?.independentWitnessApproved!==true){
 throw Error("original source, interface, ACK, owner and independent-review evidence must all be approved before signing");
}
const privateKey=createPrivateKey(readFileSync(args.get("private-key-file"),"utf8"));
if(privateKey.asymmetricKeyType!=="ed25519")throw Error("original device private signing key must be Ed25519");
const payload={
 schema:"rosevear.ai-data-platform.build442-original-device-witness.v1",
 appId,sourceCommit,witnessId:args.get("witness-id"),witnessRole:args.get("witness-role"),
 originalDeviceId,observedAt:new Date().toISOString(),nonce:randomBytes(24).toString("hex"),
 interfaceCertified:true,receiverAckVerified:true,ownerAcceptanceVerified:true,keyId:args.get("key-id")
};
const signature=sign(null,Buffer.from(JSON.stringify(payload),"utf8"),privateKey).toString("base64");
process.stdout.write(JSON.stringify({...payload,signature},null,2)+"\n");
