import { NextRequest, NextResponse } from "next/server";
import { verifyTelegramInitData } from "@/lib/verifyInitData";
export async function POST(req: NextRequest){
  const { initData } = await req.json();
  const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
  const requireTg = (process.env.REQUIRE_TELEGRAM_INIT || "false")==="true";
  if(!requireTg) return NextResponse.json({ ok:true, devMode:true });
  const ok = verifyTelegramInitData(initData, botToken);
  return NextResponse.json({ ok });
}
