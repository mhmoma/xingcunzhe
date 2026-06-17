const CODES: Record<string, { id: string; allowedUserId: string }> = {
  '琦琦专属礼包': {
    id: 'scythe-gift-20260617',
    allowedUserId: '4701f6f4-6d69-4cd8-8dbe-0f20f2668162',
  },
};

export default async function (request: any, ctx: any) {
  const body = request.body ?? {};
  if (body.method !== 'claim') throw new Error('unknown redeem method');

  const code = String(body.code ?? '').trim();
  const reward = CODES[code];
  if (!reward) throw new Error('兑换码无效');
  if (!ctx.user?.id || ctx.user.id !== reward.allowedUserId) {
    throw new Error('该兑换码仅限指定用户领取');
  }

  const key = `redeem:${reward.id}`;
  const used = (await ctx.kv.get(key))?.value;
  if (used?.claimed) return { applied: false, id: reward.id };

  await ctx.kv.put(key, { claimed: true, at: new Date().toISOString() });
  return { applied: true, id: reward.id };
}
