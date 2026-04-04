export interface TarotCard {
  id: number;
  name: string;
  nameEn: string;
  keywords: string[];
  description: string;
  imageUrl: string;
}

const CDN = 'https://cdn.jsdelivr.net/npm/tarot-card-img';

export const TAROT_CARDS: TarotCard[] = [
  // ===== 大阿尔卡那 (Major Arcana) 0-21 =====
  { id: 0,  name: "愚者",    nameEn: "The Fool",          keywords: ["开始", "自由", "纯真"],       description: "代表着新的开始、无限的可能性和对未知的信任。",           imageUrl: `${CDN}/major/0m.jpg` },
  { id: 1,  name: "魔术师",  nameEn: "The Magician",      keywords: ["创造力", "行动", "意志力"],   description: "象征着将想法转化为现实的能力和资源的整合。",           imageUrl: `${CDN}/major/1m.jpg` },
  { id: 2,  name: "女祭司",  nameEn: "The High Priestess",keywords: ["直觉", "潜意识", "神秘"],     description: "代表内在的智慧、直觉和对精神世界的探索。",             imageUrl: `${CDN}/major/2m.jpg` },
  { id: 3,  name: "皇后",    nameEn: "The Empress",       keywords: ["丰饶", "母性", "自然"],       description: "象征着创造力、感官享受和生命的繁荣。",               imageUrl: `${CDN}/major/3m.jpg` },
  { id: 4,  name: "皇帝",    nameEn: "The Emperor",       keywords: ["权威", "结构", "父亲"],       description: "代表着秩序、稳定、领导力和世俗的成功。",             imageUrl: `${CDN}/major/4m.jpg` },
  { id: 5,  name: "教皇",    nameEn: "The Hierophant",    keywords: ["传统", "信仰", "教育"],       description: "象征着社会规范、传统价值观和精神上的指导。",           imageUrl: `${CDN}/major/5m.jpg` },
  { id: 6,  name: "恋人",    nameEn: "The Lovers",        keywords: ["选择", "和谐", "关系"],       description: "代表着重要的决定、价值观的对齐和深刻的连接。",         imageUrl: `${CDN}/major/6m.jpg` },
  { id: 7,  name: "战车",    nameEn: "The Chariot",       keywords: ["意志", "胜利", "自律"],       description: "象征着通过坚强的意志和自律克服困难，取得成功。",       imageUrl: `${CDN}/major/7m.jpg` },
  { id: 8,  name: "力量",    nameEn: "Strength",          keywords: ["勇气", "耐心", "内在力量"],   description: "代表着温柔的坚持、内在的勇气和对本能的掌控。",         imageUrl: `${CDN}/major/8m.jpg` },
  { id: 9,  name: "隐士",    nameEn: "The Hermit",        keywords: ["内省", "孤独", "寻求真理"],   description: "象征着向内探索、寻求智慧和暂时的退隐。",             imageUrl: `${CDN}/major/9m.jpg` },
  { id: 10, name: "命运之轮", nameEn: "Wheel of Fortune",  keywords: ["变化", "循环", "运气"],       description: "代表着命运的转折、不可控的变化和周而复始的规律。",     imageUrl: `${CDN}/major/10m.jpg` },
  { id: 11, name: "正义",    nameEn: "Justice",           keywords: ["公平", "真理", "法律"],       description: "象征着因果报应、客观的判断和对真相的追求。",           imageUrl: `${CDN}/major/11m.jpg` },
  { id: 12, name: "倒吊人",  nameEn: "The Hanged Man",    keywords: ["牺牲", "新视角", "停滞"],     description: "代表着换个角度看问题、自愿的牺牲和耐心的等待。",       imageUrl: `${CDN}/major/12m.jpg` },
  { id: 13, name: "死神",    nameEn: "Death",             keywords: ["结束", "转变", "新生"],       description: "象征着旧事物的终结、深刻的变革和新阶段的开始。",       imageUrl: `${CDN}/major/13m.jpg` },
  { id: 14, name: "节制",    nameEn: "Temperance",        keywords: ["平衡", "融合", "耐心"],       description: "代表着和谐、适度、不同元素的融合和精神的净化。",       imageUrl: `${CDN}/major/14m.jpg` },
  { id: 15, name: "恶魔",    nameEn: "The Devil",         keywords: ["束缚", "欲望", "物质主义"],   description: "象征着被欲望困住、成瘾行为和对物质世界的过度依赖。",   imageUrl: `${CDN}/major/15m.jpg` },
  { id: 16, name: "高塔",    nameEn: "The Tower",         keywords: ["剧变", "觉醒", "释放"],       description: "代表着突然的、往往是痛苦的改变，以及虚假结构的崩塌。", imageUrl: `${CDN}/major/16m.jpg` },
  { id: 17, name: "星星",    nameEn: "The Star",          keywords: ["希望", "灵感", "治愈"],       description: "象征着在黑暗后的希望、宁静和对未来的信心。",           imageUrl: `${CDN}/major/17m.jpg` },
  { id: 18, name: "月亮",    nameEn: "The Moon",          keywords: ["幻觉", "恐惧", "直觉"],       description: "代表着潜意识的阴影、不确定性和对直觉的考验。",         imageUrl: `${CDN}/major/18m.jpg` },
  { id: 19, name: "太阳",    nameEn: "The Sun",           keywords: ["成功", "快乐", "活力"],       description: "象征着光明、成功、纯粹的快乐和生命力的绽放。",         imageUrl: `${CDN}/major/19m.jpg` },
  { id: 20, name: "审判",    nameEn: "Judgement",         keywords: ["觉醒", "重生", "使命"],       description: "代表着对过去的总结、新的召唤和精神上的重生。",         imageUrl: `${CDN}/major/20m.jpg` },
  { id: 21, name: "世界",    nameEn: "The World",         keywords: ["圆满", "完成", "旅行"],       description: "象征着一个阶段的完美结束、整合与全球性的视野。",       imageUrl: `${CDN}/major/21m.jpg` },

  // ===== 权杖 (Wands) 22-35 =====
  { id: 22, name: "权杖王牌", nameEn: "Ace of Wands",    keywords: ["灵感", "新机遇", "创造力"],   description: "一股全新的创造能量涌现，代表着激情的点燃和事业的新起点。", imageUrl: `${CDN}/wands/1w.jpg` },
  { id: 23, name: "权杖二",   nameEn: "Two of Wands",    keywords: ["规划", "远见", "决策"],       description: "站在十字路口审视未来，手握资源准备迈出关键一步。",         imageUrl: `${CDN}/wands/2w.jpg` },
  { id: 24, name: "权杖三",   nameEn: "Three of Wands",  keywords: ["拓展", "前瞻", "领导力"],     description: "计划已经启动并初见成效，视野正在向更广阔的领域延伸。",     imageUrl: `${CDN}/wands/3w.jpg` },
  { id: 25, name: "权杖四",   nameEn: "Four of Wands",   keywords: ["庆祝", "稳定", "里程碑"],     description: "阶段性的成功值得庆贺，根基已稳，和谐的氛围环绕四周。",     imageUrl: `${CDN}/wands/4w.jpg` },
  { id: 26, name: "权杖五",   nameEn: "Five of Wands",   keywords: ["竞争", "冲突", "挑战"],       description: "多方力量的碰撞与角逐，需要在混乱中找到自己的立足点。",     imageUrl: `${CDN}/wands/5w.jpg` },
  { id: 27, name: "权杖六",   nameEn: "Six of Wands",    keywords: ["胜利", "认可", "荣耀"],       description: "努力获得了公众的认可和赞赏，凯旋而归的荣耀时刻。",         imageUrl: `${CDN}/wands/6w.jpg` },
  { id: 28, name: "权杖七",   nameEn: "Seven of Wands",  keywords: ["坚守", "防御", "勇气"],       description: "面对来自各方的压力和挑战，需要坚定立场、捍卫成果。",       imageUrl: `${CDN}/wands/7w.jpg` },
  { id: 29, name: "权杖八",   nameEn: "Eight of Wands",  keywords: ["迅速", "行动", "推进"],       description: "事态正在快速发展，消息纷至沓来，一切都在加速推进。",       imageUrl: `${CDN}/wands/8w.jpg` },
  { id: 30, name: "权杖九",   nameEn: "Nine of Wands",   keywords: ["坚韧", "警惕", "最后考验"],   description: "历经磨难后的最后一道关卡，伤痕累累但依然屹立不倒。",       imageUrl: `${CDN}/wands/9w.jpg` },
  { id: 31, name: "权杖十",   nameEn: "Ten of Wands",    keywords: ["重负", "责任", "压力"],       description: "承担了过多的责任和压力，需要学会放下或寻求分担。",         imageUrl: `${CDN}/wands/10w.jpg` },
  { id: 32, name: "权杖侍从", nameEn: "Page of Wands",   keywords: ["探索", "热情", "冒险"],       description: "充满好奇心和冒险精神的年轻能量，渴望探索新的可能。",       imageUrl: `${CDN}/wands/pw.jpg` },
  { id: 33, name: "权杖骑士", nameEn: "Knight of Wands", keywords: ["冲劲", "大胆", "行动派"],     description: "充满激情地冲向目标，大胆无畏但需注意鲁莽的风险。",         imageUrl: `${CDN}/wands/nw.jpg` },
  { id: 34, name: "权杖王后", nameEn: "Queen of Wands",  keywords: ["自信", "魅力", "独立"],       description: "散发着温暖而强大的个人魅力，自信独立且富有感染力。",       imageUrl: `${CDN}/wands/qw.jpg` },
  { id: 35, name: "权杖国王", nameEn: "King of Wands",   keywords: ["领袖", "远见", "果断"],       description: "天生的领导者，以远见和果断的行动力引领方向。",             imageUrl: `${CDN}/wands/kw.jpg` },

  // ===== 圣杯 (Cups) 36-49 =====
  { id: 36, name: "圣杯王牌", nameEn: "Ace of Cups",    keywords: ["爱", "新感情", "情感觉醒"],   description: "情感世界的全新开端，爱与喜悦如泉涌般充盈内心。",           imageUrl: `${CDN}/cups/1c.jpg` },
  { id: 37, name: "圣杯二",   nameEn: "Two of Cups",    keywords: ["连接", "伙伴", "互相吸引"],   description: "两颗心灵的深度连接，代表着平等互惠的情感纽带。",           imageUrl: `${CDN}/cups/2c.jpg` },
  { id: 38, name: "圣杯三",   nameEn: "Three of Cups",  keywords: ["友谊", "欢聚", "共同庆祝"],   description: "与志同道合的伙伴共享喜悦，社交关系带来温暖与支持。",       imageUrl: `${CDN}/cups/3c.jpg` },
  { id: 39, name: "圣杯四",   nameEn: "Four of Cups",   keywords: ["倦怠", "冷漠", "内省"],       description: "对眼前的一切感到麻木和不满，需要向内寻找真正的渴望。",     imageUrl: `${CDN}/cups/4c.jpg` },
  { id: 40, name: "圣杯五",   nameEn: "Five of Cups",   keywords: ["失落", "悲伤", "遗憾"],       description: "沉浸在失去的痛苦中，但身后仍有未被注意到的希望。",         imageUrl: `${CDN}/cups/5c.jpg` },
  { id: 41, name: "圣杯六",   nameEn: "Six of Cups",    keywords: ["怀旧", "童真", "重逢"],       description: "过去的美好记忆浮现，旧日的人或事重新进入生活。",           imageUrl: `${CDN}/cups/6c.jpg` },
  { id: 42, name: "圣杯七",   nameEn: "Seven of Cups",  keywords: ["幻想", "选择", "迷惑"],       description: "面对众多诱人的选项却难以抉择，需要分辨幻象与现实。",       imageUrl: `${CDN}/cups/7c.jpg` },
  { id: 43, name: "圣杯八",   nameEn: "Eight of Cups",  keywords: ["放下", "离开", "寻找意义"],   description: "主动离开已不再满足内心的处境，踏上寻找更深层意义的旅程。", imageUrl: `${CDN}/cups/8c.jpg` },
  { id: 44, name: "圣杯九",   nameEn: "Nine of Cups",   keywords: ["满足", "愿望成真", "幸福"],   description: "内心深处的愿望得到实现，物质与情感上的双重满足。",         imageUrl: `${CDN}/cups/9c.jpg` },
  { id: 45, name: "圣杯十",   nameEn: "Ten of Cups",    keywords: ["圆满", "家庭幸福", "和谐"],   description: "情感生活的终极圆满，家庭和睦、关系和谐的理想状态。",       imageUrl: `${CDN}/cups/10c.jpg` },
  { id: 46, name: "圣杯侍从", nameEn: "Page of Cups",   keywords: ["敏感", "直觉", "浪漫"],       description: "带着孩童般的纯真感知情感世界，直觉敏锐且富有想象力。",     imageUrl: `${CDN}/cups/pc.jpg` },
  { id: 47, name: "圣杯骑士", nameEn: "Knight of Cups", keywords: ["浪漫", "追求", "理想主义"],   description: "怀揣着浪漫的理想追寻内心的召唤，是情感世界的骑士。",       imageUrl: `${CDN}/cups/nc.jpg` },
  { id: 48, name: "圣杯王后", nameEn: "Queen of Cups",  keywords: ["共情", "温柔", "情感智慧"],   description: "拥有深邃的情感智慧和强大的共情能力，是心灵的守护者。",     imageUrl: `${CDN}/cups/qc.jpg` },
  { id: 49, name: "圣杯国王", nameEn: "King of Cups",   keywords: ["情感成熟", "包容", "平静"],   description: "以成熟稳重的姿态驾驭情感，在风浪中保持内心的平静。",       imageUrl: `${CDN}/cups/kc.jpg` },

  // ===== 宝剑 (Swords) 50-63 =====
  { id: 50, name: "宝剑王牌", nameEn: "Ace of Swords",    keywords: ["真相", "突破", "清晰"],     description: "思维的利刃划破迷雾，带来真相的揭示和认知的突破。",           imageUrl: `${CDN}/swords/1s.jpg` },
  { id: 51, name: "宝剑二",   nameEn: "Two of Swords",    keywords: ["僵局", "抉择", "逃避"],     description: "蒙蔽双眼拒绝面对现实，内心的矛盾导致决策的停滞。",           imageUrl: `${CDN}/swords/2s.jpg` },
  { id: 52, name: "宝剑三",   nameEn: "Three of Swords",  keywords: ["心碎", "背叛", "悲痛"],     description: "情感上的深刻伤痛，来自背叛、分离或令人心碎的真相。",         imageUrl: `${CDN}/swords/3s.jpg` },
  { id: 53, name: "宝剑四",   nameEn: "Four of Swords",   keywords: ["休息", "恢复", "静修"],     description: "在经历风暴后需要暂时退隐休养，为下一阶段积蓄力量。",         imageUrl: `${CDN}/swords/4s.jpg` },
  { id: 54, name: "宝剑五",   nameEn: "Five of Swords",   keywords: ["冲突", "失败", "自私"],     description: "一场没有赢家的争斗，胜利的代价是关系的破裂和信任的丧失。",   imageUrl: `${CDN}/swords/5s.jpg` },
  { id: 55, name: "宝剑六",   nameEn: "Six of Swords",    keywords: ["过渡", "离开", "疗愈"],     description: "离开痛苦的过去驶向平静的彼岸，虽然沉重但方向正确。",         imageUrl: `${CDN}/swords/6s.jpg` },
  { id: 56, name: "宝剑七",   nameEn: "Seven of Swords",  keywords: ["策略", "隐瞒", "独行"],     description: "试图用巧妙的手段避开正面冲突，暗中行动但未必能全身而退。",   imageUrl: `${CDN}/swords/7s.jpg` },
  { id: 57, name: "宝剑八",   nameEn: "Eight of Swords",  keywords: ["困境", "自我限制", "无力"], description: "被恐惧和消极思维困住，实际上束缚你的是自己的心魔。",         imageUrl: `${CDN}/swords/8s.jpg` },
  { id: 58, name: "宝剑九",   nameEn: "Nine of Swords",   keywords: ["焦虑", "噩梦", "自责"],     description: "深夜的焦虑与自我折磨，恐惧在脑海中被无限放大。",             imageUrl: `${CDN}/swords/9s.jpg` },
  { id: 59, name: "宝剑十",   nameEn: "Ten of Swords",    keywords: ["终结", "触底", "黎明前"],   description: "最深的低谷和最彻底的结束，但也意味着否极泰来的转机。",       imageUrl: `${CDN}/swords/10s.jpg` },
  { id: 60, name: "宝剑侍从", nameEn: "Page of Swords",   keywords: ["好奇", "机警", "求知"],     description: "以敏锐的观察力和旺盛的求知欲探索真相，思维活跃但尚欠沉稳。", imageUrl: `${CDN}/swords/ps.jpg` },
  { id: 61, name: "宝剑骑士", nameEn: "Knight of Swords", keywords: ["果断", "急躁", "直言"],     description: "以雷厉风行的速度冲向目标，锋利直接但容易忽略后果。",         imageUrl: `${CDN}/swords/ns.jpg` },
  { id: 62, name: "宝剑王后", nameEn: "Queen of Swords",  keywords: ["理性", "独立", "洞察"],     description: "以冷静理性的头脑洞察一切，不被情感左右的独立判断者。",       imageUrl: `${CDN}/swords/qs.jpg` },
  { id: 63, name: "宝剑国王", nameEn: "King of Swords",   keywords: ["权威", "公正", "逻辑"],     description: "以严谨的逻辑和公正的态度做出裁决，是真理与秩序的守护者。",   imageUrl: `${CDN}/swords/ks.jpg` },

  // ===== 星币 (Pentacles) 64-77 =====
  { id: 64, name: "星币王牌", nameEn: "Ace of Pentacles",    keywords: ["财富", "新机会", "繁荣"],   description: "物质世界的全新机遇降临，财富与丰盛的种子已经播下。",         imageUrl: `${CDN}/pentacles/1p.jpg` },
  { id: 65, name: "星币二",   nameEn: "Two of Pentacles",    keywords: ["平衡", "适应", "灵活"],     description: "在多重事务间灵活周旋，需要保持动态平衡以应对变化。",         imageUrl: `${CDN}/pentacles/2p.jpg` },
  { id: 66, name: "星币三",   nameEn: "Three of Pentacles",  keywords: ["合作", "技艺", "精进"],     description: "团队协作中展现专业技能，精益求精的工匠精神获得认可。",       imageUrl: `${CDN}/pentacles/3p.jpg` },
  { id: 67, name: "星币四",   nameEn: "Four of Pentacles",   keywords: ["守财", "控制", "安全感"],   description: "紧紧抓住已有的资源不愿放手，对失去的恐惧限制了成长。",       imageUrl: `${CDN}/pentacles/4p.jpg` },
  { id: 68, name: "星币五",   nameEn: "Five of Pentacles",   keywords: ["困窘", "孤立", "匮乏"],     description: "物质或精神上的匮乏感，在困境中感到被遗弃和孤立无援。",       imageUrl: `${CDN}/pentacles/5p.jpg` },
  { id: 69, name: "星币六",   nameEn: "Six of Pentacles",    keywords: ["慷慨", "施与受", "公平"],   description: "资源的流动与分享，在给予和接受之间找到平衡。",               imageUrl: `${CDN}/pentacles/6p.jpg` },
  { id: 70, name: "星币七",   nameEn: "Seven of Pentacles",  keywords: ["耐心", "评估", "长期投资"], description: "审视长期努力的成果，在收获前需要耐心等待和战略调整。",       imageUrl: `${CDN}/pentacles/7p.jpg` },
  { id: 71, name: "星币八",   nameEn: "Eight of Pentacles",  keywords: ["勤奋", "专注", "精通"],     description: "全身心投入技能的磨练和提升，通过持续努力走向精通。",         imageUrl: `${CDN}/pentacles/8p.jpg` },
  { id: 72, name: "星币九",   nameEn: "Nine of Pentacles",   keywords: ["富足", "独立", "享受成果"], description: "通过自身努力实现了物质与精神的富足，优雅地享受成果。",       imageUrl: `${CDN}/pentacles/9p.jpg` },
  { id: 73, name: "星币十",   nameEn: "Ten of Pentacles",    keywords: ["传承", "家族财富", "稳定"], description: "世代积累的财富与智慧，家族的繁荣和长久的物质安全。",         imageUrl: `${CDN}/pentacles/10p.jpg` },
  { id: 74, name: "星币侍从", nameEn: "Page of Pentacles",   keywords: ["学习", "务实", "新技能"],   description: "以脚踏实地的态度学习新技能，对物质世界充满好奇和认真。",     imageUrl: `${CDN}/pentacles/pp.jpg` },
  { id: 75, name: "星币骑士", nameEn: "Knight of Pentacles", keywords: ["稳健", "可靠", "坚持"],     description: "以最稳健可靠的步伐推进目标，虽然缓慢但绝不半途而废。",       imageUrl: `${CDN}/pentacles/np.jpg` },
  { id: 76, name: "星币王后", nameEn: "Queen of Pentacles",  keywords: ["滋养", "务实", "富足"],     description: "以温暖务实的方式经营生活，在物质与情感上滋养身边的人。",     imageUrl: `${CDN}/pentacles/qp.jpg` },
  { id: 77, name: "星币国王", nameEn: "King of Pentacles",   keywords: ["成就", "稳定", "商业头脑"], description: "物质世界的掌控者，以卓越的商业智慧建立起稳固的帝国。",     imageUrl: `${CDN}/pentacles/kp.jpg` },
];

export const SPREADS = {
  single: {
    name: "单张判断",
    description: "适合快速判断一件事的好坏、凶吉或是否值得做。",
    positions: ["核心结论"],
    count: 1
  },
  three: {
    name: "三张基础牌阵",
    description: "最常用的牌阵，涵盖过去、现在、未来或现状、阻碍、发展。",
    positions: ["现状", "阻碍", "发展"],
    count: 3
  },
  five: {
    name: "五张进阶牌阵",
    description: "深入分析问题的各个维度，适合复杂决策。",
    positions: ["总趋势", "当前状态", "外部变量", "转折点", "最终走向"],
    count: 5
  },
  relationship: {
    name: "感情/关系牌阵",
    description: "深入剖析双方心态、互动现状及未来走向。",
    positions: ["我的心态", "对方心态", "关系现状", "潜在挑战", "未来走向"],
    count: 5
  },
  career: {
    name: "事业/决策牌阵",
    description: "分析职场现状、优劣势及行动建议。",
    positions: ["现状", "个人优势", "外部劣势", "潜在机遇", "最终建议"],
    count: 5
  },
  week: {
    name: "周运势牌阵",
    description: "预测未来七天的每日运势及本周核心主题。",
    positions: ["本周主题", "周一", "周二", "周三", "周四", "周五", "周六", "周日"],
    count: 8
  },
  ten: {
    name: "十张年度牌阵",
    description: "全面的年度或大周期预测，涵盖生活的方方面面。",
    positions: [
      "自我状态", "环境影响", "潜意识", "过去基础", "近期动态",
      "未来发展", "他人态度", "内心恐惧", "希望与建议", "最终结果"
    ],
    count: 10
  }
};

export type SpreadType = keyof typeof SPREADS;
