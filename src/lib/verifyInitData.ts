import crypto from "crypto";
export function verifyTelegramInitData(initData: string, botToken: string){
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get("hash"); if(!hash) return false;
  const arr:string[]=[]; urlParams.forEach((v,k)=>{ if(k!=="hash") arr.push(`${k}=${v}`) });
  arr.sort((a,b)=>a.localeCompare(b));
  const dataCheckString = arr.join("\n");
  const secretKey = crypto.createHmac("sha256","WebAppData").update(botToken).digest();
  const signature = crypto.createHmac("sha256",secretKey).update(dataCheckString).digest("hex");
  return signature===hash;
}
