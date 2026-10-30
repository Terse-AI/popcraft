/* StarVale game data. Mechanics, prices and growth times follow Stardew Valley; people and places are our own. */
const n=(zh,en)=>({zh,en});

/* id: nm, season(s), days to mature, sell price, seed cost, optional regrow days, yield, colours, plant form */
export const CROPS={
  parsnip:{em:'🥕',nm:n('防风草','Parsnip'),season:[0],days:4,price:35,seed:20,col:0xe8c35a,fruit:0xd9a12e},
  potato:{em:'🥔',nm:n('土豆','Potato'),season:[0],days:6,price:80,seed:50,col:0x7fae5b,fruit:0xb98a4e,extra:.25},
  cauliflower:{em:'🥦',nm:n('花椰菜','Cauliflower'),season:[0],days:12,price:175,seed:80,col:0x9ec96a,fruit:0xe7edc9},
  kale:{em:'🥬',nm:n('羽衣甘蓝','Kale'),season:[0],days:6,price:110,seed:70,col:0x6fae5b,fruit:0x4f8f3a},
  garlic:{em:'🧄',nm:n('大蒜','Garlic'),season:[0],days:4,price:60,seed:40,col:0x8fb86a,fruit:0xefe6d6},
  green_bean:{em:'🫛',nm:n('四季豆','Green Bean'),season:[0],days:10,price:40,seed:60,regrow:3,col:0x5fa84e,fruit:0x58a040},
  strawberry:{em:'🍓',nm:n('草莓','Strawberry'),season:[0],days:8,price:120,seed:100,regrow:4,col:0x6fbf5a,fruit:0xe84b56},
  rhubarb:{em:'🌿',nm:n('大黄','Rhubarb'),season:[0],days:13,price:220,seed:100,col:0x7fae5b,fruit:0xc0404e},
  melon:{em:'🍈',nm:n('甜瓜','Melon'),season:[1],days:12,price:250,seed:80,col:0x8fc35a,fruit:0xa8d26a},
  tomato:{em:'🍅',nm:n('番茄','Tomato'),season:[1],days:11,price:60,seed:50,regrow:4,col:0x62a24d,fruit:0xe5503a},
  blueberry:{em:'🫐',nm:n('蓝莓','Blueberry'),season:[1],days:13,price:50,seed:80,regrow:4,yield:3,col:0x5fa85a,fruit:0x4a6fd1},
  pepper:{em:'🌶️',nm:n('辣椒','Hot Pepper'),season:[1],days:5,price:40,seed:40,regrow:3,col:0x6fb04d,fruit:0xd63a2f},
  corn:{em:'🌽',nm:n('玉米','Corn'),season:[1,2],days:14,price:50,seed:150,regrow:4,col:0x8fc35a,fruit:0xf2d04b},
  radish:{em:'🔴',nm:n('萝卜','Radish'),season:[1],days:6,price:90,seed:40,col:0x8fc35a,fruit:0xe0506a},
  wheat:{em:'🌾',nm:n('小麦','Wheat'),season:[1,2],days:4,price:25,seed:10,col:0xd8c25a,fruit:0xe8d06a},
  hops:{em:'🌿',nm:n('啤酒花','Hops'),season:[1],days:11,price:25,seed:60,regrow:1,col:0x7fae5b,fruit:0xb8cc6a},
  red_cabbage:{em:'🥬',nm:n('红叶卷心菜','Red Cabbage'),season:[1],days:9,price:260,seed:100,col:0x7a5a9a,fruit:0x8a4a9a},
  sunflower:{em:'🌻',nm:n('向日葵','Sunflower'),season:[1,2],days:8,price:80,seed:200,col:0x7fae5b,fruit:0xf0c02a},
  poppy:{em:'🌺',nm:n('虞美人','Poppy'),season:[1],days:7,price:140,seed:100,col:0x7fae5b,fruit:0xe84030},
  eggplant:{em:'🍆',nm:n('茄子','Eggplant'),season:[2],days:5,price:60,seed:20,regrow:5,col:0x6f9b4d,fruit:0x7a4ba0},
  pumpkin:{em:'🎃',nm:n('南瓜','Pumpkin'),season:[2],days:13,price:320,seed:100,col:0x8aad55,fruit:0xe08a2a},
  yam:{em:'🍠',nm:n('山药','Yam'),season:[2],days:10,price:160,seed:60,col:0x9ab35a,fruit:0xc87d3a},
  cranberry:{em:'🔴',nm:n('蔓越莓','Cranberries'),season:[2],days:7,price:75,seed:240,regrow:5,yield:2,col:0x5fa05a,fruit:0xc0392b},
  bok_choy:{em:'🥬',nm:n('小白菜','Bok Choy'),season:[2],days:4,price:80,seed:50,col:0x6fae5b,fruit:0xeaf0d0},
  beet:{em:'🔴',nm:n('甜菜','Beet'),season:[2],days:6,price:100,seed:20,col:0x7f9e5b,fruit:0x8a2040},
  amaranth:{em:'🌾',nm:n('苋菜','Amaranth'),season:[2],days:7,price:150,seed:70,col:0x8a5a6a,fruit:0xa83060},
  artichoke:{em:'🌿',nm:n('洋蓟','Artichoke'),season:[2],days:8,price:160,seed:30,col:0x6f9e6a,fruit:0x5a8a5a},
  grape:{em:'🍇',nm:n('葡萄','Grape'),season:[2],days:10,price:80,seed:60,regrow:3,col:0x7fae5b,fruit:0x7a4ba0}
};
export const CROP_FORM={parsnip:'root',radish:'root',beet:'root',garlic:'root',potato:'tuber',yam:'tuber',cauliflower:'head',kale:'head',red_cabbage:'head',bok_choy:'head',artichoke:'head',
  tomato:'fruiting',pepper:'fruiting',eggplant:'fruiting',green_bean:'fruiting',strawberry:'berry',blueberry:'berry',cranberry:'berry',
  pumpkin:'vine',melon:'vine',grape:'vine',hops:'vine',corn:'grain',wheat:'grain',amaranth:'grain',rhubarb:'head',sunflower:'grain',poppy:'grain'};

/* loc: lake, river, any; time [from,to] in minutes; w: clear, rain, any; diff 15-110; motion: mixed dart smooth sinker floater */
export const FISH={
  carp:{em:'🐟',nm:n('鲤鱼','Carp'),price:30,season:[0,1,2],loc:'lake',time:[360,1560],w:'any',diff:15,motion:'mixed',col:0x9a8a4a},
  bass:{em:'🐟',nm:n('大嘴鲈鱼','Largemouth Bass'),price:100,season:[0,1,2,3],loc:'lake',time:[360,1140],w:'any',diff:50,motion:'mixed',col:0x6a7a3a},
  bullhead:{em:'🐟',nm:n('大头鱼','Bullhead'),price:75,season:[0,1,2,3],loc:'lake',time:[360,1560],w:'any',diff:46,motion:'smooth',col:0x4a4a3a},
  chub:{em:'🐟',nm:n('鲢鱼','Chub'),price:50,season:[0,1,2,3],loc:'any',time:[360,1560],w:'any',diff:35,motion:'dart',col:0x7a8a8a},
  perch:{em:'🐟',nm:n('河鲈','Perch'),price:55,season:[3],loc:'lake',time:[360,1560],w:'any',diff:35,motion:'dart',col:0x9a8a3a},
  pike:{em:'🐟',nm:n('狗鱼','Pike'),price:100,season:[1,3],loc:'any',time:[360,1560],w:'any',diff:60,motion:'dart',col:0x5a7a4a},
  sturgeon:{em:'🐟',nm:n('鲟鱼','Sturgeon'),price:200,season:[1,3],loc:'lake',time:[360,1140],w:'any',diff:78,motion:'mixed',col:0x5a5a6a},
  walleye:{em:'🐟',nm:n('大眼鱼','Walleye'),price:105,season:[2],loc:'any',time:[720,1560],w:'rain',diff:45,motion:'smooth',col:0x8a8a5a},
  midnight_carp:{em:'🐟',nm:n('午夜鲤鱼','Midnight Carp'),price:150,season:[2,3],loc:'lake',time:[1320,1560],w:'any',diff:55,motion:'mixed',col:0x3a3a5a},
  lingcod:{em:'🐟',nm:n('蛇齿单线鱼','Lingcod'),price:120,season:[3],loc:'any',time:[360,1560],w:'any',diff:85,motion:'mixed',col:0x6a6a4a},
  sunfish:{em:'🐠',nm:n('太阳鱼','Sunfish'),price:30,season:[0,1],loc:'river',time:[360,1140],w:'clear',diff:30,motion:'mixed',col:0xd8a83a},
  bream:{em:'🐟',nm:n('鳊鱼','Bream'),price:45,season:[0,1,2,3],loc:'river',time:[1080,1560],w:'any',diff:35,motion:'smooth',col:0x8a9a7a},
  smallmouth:{em:'🐟',nm:n('小嘴鲈鱼','Smallmouth Bass'),price:50,season:[0,2],loc:'river',time:[360,1560],w:'any',diff:28,motion:'mixed',col:0x7a8a4a},
  rainbow_trout:{em:'🐟',nm:n('虹鳟鱼','Rainbow Trout'),price:65,season:[1],loc:'river',time:[360,1140],w:'clear',diff:45,motion:'mixed',col:0xd88a8a},
  catfish:{em:'🐠',nm:n('鲶鱼','Catfish'),price:200,season:[0,2],loc:'river',time:[360,1440],w:'rain',diff:75,motion:'mixed',col:0x4a4a42},
  salmon:{em:'🐟',nm:n('鲑鱼','Salmon'),price:75,season:[2],loc:'river',time:[360,1140],w:'any',diff:50,motion:'mixed',col:0xd86a4a},
  shad:{em:'🐟',nm:n('西鲱','Shad'),price:60,season:[0,1,2],loc:'river',time:[540,1560],w:'rain',diff:45,motion:'smooth',col:0xaab0a0},
  tiger_trout:{em:'🐟',nm:n('虎纹鳟鱼','Tiger Trout'),price:150,season:[2,3],loc:'river',time:[360,1140],w:'any',diff:60,motion:'dart',col:0xb09a4a},
  dorado:{em:'🐠',nm:n('金鲯鳅','Dorado'),price:100,season:[1],loc:'river',time:[360,1140],w:'any',diff:78,motion:'mixed',col:0xe0b82a},
  // legends: one each, deep lake or under the falls
  legend:{em:'🐉',nm:n('传说之鱼','Legend'),price:5000,season:[0],loc:'lake',time:[360,1200],w:'rain',diff:110,motion:'mixed',col:0x3a8a7a,legend:true,deep:true,lvl:10},
  crimsonfish:{em:'🐉',nm:n('绯红鱼','Crimsonfish'),price:1500,season:[1],loc:'lake',time:[360,1200],w:'any',diff:95,motion:'mixed',col:0xc83030,legend:true,deep:true,lvl:5},
  angler:{em:'🐉',nm:n('琵琶鱼','Angler'),price:900,season:[2],loc:'river',time:[360,1560],w:'any',diff:85,motion:'smooth',col:0x5a4a3a,legend:true,lvl:3},
  glacierfish:{em:'🐉',nm:n('冰川鱼','Glacierfish'),price:1000,season:[3],loc:'river',time:[360,1560],w:'any',diff:100,motion:'mixed',col:0x9ac8e8,legend:true,lvl:6}
};
export const TRASH={ driftwood:{em:'🪵',nm:n('浮木','Driftwood'),price:0}, seaweed:{em:'🌿',nm:n('海草','Seaweed'),price:20}, algae:{em:'🌿',nm:n('绿藻','Green Algae'),price:15}, broken_cd:{em:'💿',nm:n('破旧唱片','Broken Disc'),price:0} };

export const ORES={
  coal:{em:'⚫',nm:n('煤','Coal'),price:15}, copper:{em:'🟠',nm:n('铜矿','Copper Ore'),price:5}, iron:{em:'⚙️',nm:n('铁矿','Iron Ore'),price:10}, gold_ore:{em:'🟡',nm:n('金矿','Gold Ore'),price:25}, iridium:{em:'🟣',nm:n('铱矿','Iridium Ore'),price:100},
  gem:{em:'💎',nm:n('钻石','Diamond'),price:750}
};
export const BARS={ copper_bar:{em:'🟧',nm:n('铜锭','Copper Bar'),price:60}, iron_bar:{em:'⬜',nm:n('铁锭','Iron Bar'),price:120}, gold_bar:{em:'🟨',nm:n('金锭','Gold Bar'),price:250}, iridium_bar:{em:'🟪',nm:n('铱锭','Iridium Bar'),price:1000}, refined_quartz:{em:'🔲',nm:n('精炼石英','Refined Quartz'),price:50} };
export const GEMS={ quartz:{em:'🔹',nm:n('石英','Quartz'),price:25}, amethyst:{em:'🟪',nm:n('紫水晶','Amethyst'),price:100}, topaz:{em:'🟨',nm:n('黄玉','Topaz'),price:80}, aquamarine:{em:'🟦',nm:n('海蓝宝石','Aquamarine'),price:180}, jade:{em:'🟩',nm:n('翡翠','Jade'),price:200}, ruby:{em:'🟥',nm:n('红宝石','Ruby'),price:250}, emerald:{em:'💚',nm:n('祖母绿','Emerald'),price:250} };
export const PRODUCTS={ egg:{em:'🥚',nm:n('鸡蛋','Egg'),price:50}, big_egg:{em:'🥚',nm:n('大鸡蛋','Large Egg'),price:95}, milk:{em:'🥛',nm:n('牛奶','Milk'),price:125}, big_milk:{em:'🥛',nm:n('大壶牛奶','Large Milk'),price:190}, duck_egg:{em:'🥚',nm:n('鸭蛋','Duck Egg'),price:95}, wool:{em:'🧶',nm:n('羊毛','Wool'),price:340}, goat_milk:{em:'🥛',nm:n('羊奶','Goat Milk'),price:225}, truffle:{em:'🍄',nm:n('松露','Truffle'),price:625} };
export const ARTISAN={ wine:{em:'🍷',nm:n('葡萄酒','Wine'),suf:'酒',mult:3,price:0}, juice:{em:'🧃',nm:n('果蔬汁','Juice'),suf:'汁',mult:2.25,price:0}, jelly:{em:'🍯',nm:n('果酱','Jelly'),suf:'酱',mult:2,add:50,price:0}, pickles:{em:'🥒',nm:n('泡菜','Pickles'),suf:'泡菜',mult:2,add:50,price:0},
  mayo:{em:'🥫',nm:n('蛋黄酱','Mayonnaise'),price:190}, cheese:{em:'🧀',nm:n('奶酪','Cheese'),price:230}, goat_cheese:{em:'🧀',nm:n('山羊奶酪','Goat Cheese'),price:400}, cloth:{em:'🧵',nm:n('布料','Cloth'),price:470}, honey:{em:'🍯',nm:n('蜂蜜','Honey'),price:100}, pale_ale:{em:'🍺',nm:n('淡啤酒','Pale Ale'),price:300}, beer:{em:'🍺',nm:n('啤酒','Beer'),price:200}, oil:{em:'🫙',nm:n('食用油','Oil'),price:100}, truffle_oil:{em:'🫙',nm:n('松露油','Truffle Oil'),price:1065}, roe:{em:'🟠',nm:n('鱼籽','Aged Roe'),price:120} };
export const MATS={ wood:{em:'🪵',nm:n('木头','Wood'),price:2}, stone:{em:'🪨',nm:n('石头','Stone'),price:2}, fiber:{em:'🌿',nm:n('纤维','Fiber'),price:1}, clay:{em:'🟤',nm:n('粘土','Clay'),price:20}, sap:{em:'💧',nm:n('树液','Sap'),price:2}, hardwood:{em:'🪵',nm:n('硬木','Hardwood'),price:15}, hay:{em:'🌾',nm:n('干草','Hay'),price:0}, bait:{em:'🪱',nm:n('鱼饵','Bait'),price:1}, slime:{em:'🟢',nm:n('史莱姆泥','Slime'),price:5}, bug_meat:{em:'🐛',nm:n('虫肉','Bug Meat'),price:8}, bat_wing:{em:'🦇',nm:n('蝙蝠翅膀','Bat Wing'),price:15}, sugar:{em:'🍚',nm:n('糖','Sugar'),price:50}, flour:{em:'🌾',nm:n('小麦粉','Wheat Flour'),price:50}, rice:{em:'🍚',nm:n('大米','Rice'),price:100}, geode:{em:'🪨',nm:n('晶洞','Geode'),price:50}, frozen_geode:{em:'🪨',nm:n('冰封晶洞','Frozen Geode'),price:100}, magma_geode:{em:'🪨',nm:n('岩浆晶洞','Magma Geode'),price:150} };
export const FORAGE={
  horseradish:{em:'🌱',nm:n('野山葵','Wild Horseradish'),price:50,season:[0]}, daffodil:{em:'🌼',nm:n('黄水仙','Daffodil'),price:30,season:[0]}, leek:{em:'🌱',nm:n('韭葱','Leek'),price:60,season:[0]}, dandelion:{em:'🌼',nm:n('蒲公英','Dandelion'),price:40,season:[0]},
  spice_berry:{em:'🫐',nm:n('香味浆果','Spice Berry'),price:80,season:[1]}, wild_grape:{em:'🍇',nm:n('野葡萄','Wild Grape'),price:80,season:[1]}, sweet_pea:{em:'🌸',nm:n('甜豌豆','Sweet Pea'),price:50,season:[1]},
  mushroom:{em:'🍄',nm:n('普通蘑菇','Common Mushroom'),price:40,season:[2]}, wild_plum:{em:'🟣',nm:n('野梅','Wild Plum'),price:80,season:[2]}, hazelnut:{em:'🌰',nm:n('榛子','Hazelnut'),price:90,season:[2]}, blackberry:{em:'🫐',nm:n('黑莓','Blackberry'),price:20,season:[2]},
  crystal_fruit:{em:'❄️',nm:n('水晶果','Crystal Fruit'),price:150,season:[3]}, crocus:{em:'🌷',nm:n('番红花','Crocus'),price:60,season:[3]}, holly:{em:'🌿',nm:n('冬青','Holly'),price:80,season:[3]}, winter_root:{em:'🥔',nm:n('冬根','Winter Root'),price:70,season:[3]}
};
export const ARTIFACTS={ arrowhead:{em:'🏹',nm:n('箭头','Arrowhead'),price:40}, ancient_doll:{em:'🧸',nm:n('古代玩偶','Ancient Doll'),price:60}, rusty_spoon:{em:'🥄',nm:n('生锈的勺子','Rusty Spoon'),price:25}, ancient_seed:{em:'🌰',nm:n('古代种子','Ancient Seed'),price:30}, chipped_amphora:{em:'🏺',nm:n('破损的双耳瓶','Chipped Amphora'),price:40}, old_coin:{em:'🪙',nm:n('古钱币','Old Coin'),price:70}, bone_flute:{em:'🦴',nm:n('骨笛','Bone Flute'),price:100}, prehistoric_tool:{em:'🪓',nm:n('史前工具','Prehistoric Tool'),price:50} };
export const FOOD={
  fried_egg:{em:'🍳',nm:n('煎蛋','Fried Egg'),price:35,energy:50,hp:22}, omelet:{em:'🍲',nm:n('蛋卷','Omelet'),price:125,energy:100,hp:45}, baked_potato:{em:'🥔',nm:n('烤土豆','Baked Potato'),price:90,energy:55,hp:25},
  salad:{em:'🥗',nm:n('田园沙拉','Salad'),price:110,energy:113,hp:50}, pumpkin_pie:{em:'🥧',nm:n('南瓜派','Pumpkin Pie'),price:385,energy:225,hp:101}, sashimi:{em:'🍣',nm:n('生鱼片','Sashimi'),price:75,energy:75,hp:33},
  bread:{em:'🍞',nm:n('面包','Bread'),price:60,energy:50,hp:22}, fish_taco:{em:'🌮',nm:n('鱼肉卷','Fish Taco'),price:500,energy:165,hp:74}, maki:{em:'🍙',nm:n('寿司卷','Maki Roll'),price:220,energy:100,hp:45}, cheese_cauli:{em:'🥘',nm:n('芝士花椰菜','Cheese Cauliflower'),price:300,energy:138,hp:62},
  beer_food:{em:'🍺',nm:n('酒馆麦酒','Tavern Ale'),price:100,energy:50,hp:22}, pizza:{em:'🍕',nm:n('披萨','Pizza'),price:300,energy:150,hp:67}, spaghetti:{em:'🍝',nm:n('意大利面','Spaghetti'),price:120,energy:75,hp:33}, tortilla:{em:'🫓',nm:n('玉米饼','Tortilla'),price:50,energy:25,hp:11}, parsnip_soup:{em:'🍜',nm:n('防风草汤','Parsnip Soup'),price:120,energy:113,hp:50}, cranberry_sauce:{em:'🥫',nm:n('蔓越莓酱','Cranberry Sauce'),price:120,energy:125,hp:56},
  grilled_trout:{em:'🐟',nm:n('烤鳟鱼','Trout Soup'),price:100,energy:50,hp:22}, coffee:{em:'☕',nm:n('咖啡','Coffee'),price:150,energy:3,hp:1,speed:1}
};
export const COOK={
  fried_egg:{cost:{'product:egg':1}}, omelet:{cost:{'product:egg':1,'product:milk':1}}, baked_potato:{cost:{'crop:potato':1}}, salad:{cost:{'forage:leek':1,'forage:dandelion':1,'mat:sugar':1}},
  pumpkin_pie:{cost:{'crop:pumpkin':1,'mat:flour':1,'product:milk':1,'mat:sugar':1}}, sashimi:{cost:{'fish:*':1}}, bread:{cost:{'mat:flour':1}}, maki:{cost:{'fish:*':1,'mat:rice':1,'mat:seaweed':1}}, cheese_cauli:{cost:{'crop:cauliflower':1,'artisan:cheese':1}},
  pizza:{cost:{'mat:flour':1,'crop:tomato':1,'artisan:cheese':1}}, tortilla:{cost:{'crop:corn':1}}, fish_taco:{cost:{'fish:*':1,'crop:tomato':1,'crop:corn':1}}, parsnip_soup:{cost:{'crop:parsnip':1,'product:milk':1,'mat:sugar':1}}, cranberry_sauce:{cost:{'crop:cranberry':1,'mat:sugar':1}}, spaghetti:{cost:{'mat:flour':1,'crop:tomato':1}}
};

/* crafting: machines take time, keyed by minutes of game time */
export const CRAFTABLES={
  chest:{em:'🧰',nm:n('箱子','Chest'),cost:{'mat:wood':50},lvl:['',0]},
  scarecrow:{em:'🥷',nm:n('稻草人','Scarecrow'),cost:{'mat:wood':50,'ore:coal':1,'mat:fiber':20},lvl:['farm',1]},
  fence:{em:'🪵',nm:n('栅栏','Wood Fence'),cost:{'mat:wood':2},lvl:['',0]},
  torch:{em:'🔥',nm:n('火把','Torch'),cost:{'mat:wood':1,'mat:sap':2},lvl:['',0]},
  sprinkler:{em:'💧',nm:n('洒水器','Sprinkler'),cost:{'bar:copper_bar':1,'bar:iron_bar':1},lvl:['farm',2],range:1},
  quality_sprinkler:{em:'💦',nm:n('优质洒水器','Quality Sprinkler'),cost:{'bar:iron_bar':1,'bar:gold_bar':1,'bar:refined_quartz':1},lvl:['farm',6],range:2},
  iridium_sprinkler:{em:'🌊',nm:n('铱制洒水器','Iridium Sprinkler'),cost:{'bar:gold_bar':1,'bar:iridium_bar':1,'mat:sap':1},lvl:['farm',9],range:3},
  basic_fert:{em:'🟤',nm:n('基础肥料','Basic Fertilizer'),cost:{'mat:sap':2},lvl:['farm',1],fert:'q1'},
  speed_gro:{em:'🟢',nm:n('生长激素','Speed-Gro'),cost:{'mat:bug_meat':1,'mat:sap':5},lvl:['farm',3],fert:'s1'},
  furnace:{em:'🔥',nm:n('熔炉','Furnace'),cost:{'ore:copper':20,'mat:stone':25},lvl:['',0],machine:1},
  keg:{em:'🛢️',nm:n('小桶','Keg'),cost:{'mat:wood':30,'bar:copper_bar':1,'bar:iron_bar':1},lvl:['farm',8],machine:1},
  preserves_jar:{em:'🫙',nm:n('罐头瓶','Preserves Jar'),cost:{'mat:wood':50,'mat:stone':40,'ore:coal':8},lvl:['farm',4],machine:1},
  mayo_machine:{em:'🥫',nm:n('蛋黄酱机','Mayonnaise Machine'),cost:{'mat:wood':15,'mat:stone':15,'bar:copper_bar':1},lvl:['farm',2],machine:1},
  cheese_press:{em:'🧀',nm:n('奶酪压制机','Cheese Press'),cost:{'mat:wood':45,'mat:stone':45,'mat:hardwood':10},lvl:['farm',6],machine:1},
  loom:{em:'🧵',nm:n('织布机','Loom'),cost:{'mat:wood':60,'mat:fiber':30},lvl:['farm',7],machine:1},
  bee_house:{em:'🐝',nm:n('蜂房','Bee House'),cost:{'mat:wood':40,'ore:coal':8,'bar:iron_bar':1},lvl:['farm',3],machine:1},
  charcoal_kiln:{em:'♨️',nm:n('炭窑','Charcoal Kiln'),cost:{'mat:wood':20,'bar:copper_bar':2},lvl:['forage',4],machine:1},
  crab_pot:{em:'🦀',nm:n('蟹笼','Crab Pot'),cost:{'mat:wood':40,'bar:iron_bar':3},lvl:['fish',3],water:1}
};
/* input → output, minutes */
export const MACHINES={
  furnace:[{in:'ore:copper',n:5,fuel:1,out:'bar:copper_bar',min:30},{in:'ore:iron',n:5,fuel:1,out:'bar:iron_bar',min:120},{in:'ore:gold_ore',n:5,fuel:1,out:'bar:gold_bar',min:300},{in:'ore:iridium',n:5,fuel:1,out:'bar:iridium_bar',min:480},{in:'gem:quartz',n:1,fuel:1,out:'bar:refined_quartz',min:90}],
  mayo_machine:[{in:'product:egg',n:1,out:'artisan:mayo',min:180},{in:'product:big_egg',n:1,out:'artisan:mayo',min:180,q:2}],
  cheese_press:[{in:'product:milk',n:1,out:'artisan:cheese',min:200},{in:'product:big_milk',n:1,out:'artisan:cheese',min:200,q:2},{in:'product:goat_milk',n:1,out:'artisan:goat_cheese',min:200}],
  loom:[{in:'product:wool',n:1,out:'artisan:cloth',min:240}],
  charcoal_kiln:[{in:'mat:wood',n:10,out:'ore:coal',min:30}],
  keg:[{in:'crop:*',n:1,out:'wine',min:7*1440,fruit:1},{in:'crop:*',n:1,out:'juice',min:4*1440},{in:'crop:hops',n:1,out:'artisan:pale_ale',min:2250},{in:'crop:wheat',n:1,out:'artisan:beer',min:1750}],
  preserves_jar:[{in:'crop:*',n:1,out:'jelly',min:3*1440,fruit:1},{in:'crop:*',n:1,out:'pickles',min:3*1440}]
};
export const FRUITY=['strawberry','melon','tomato','blueberry','cranberry','grape','pepper'];
export const TOOL_TIERS=[
  {ab:'Cu',nm:n('铜','Copper'),gold:2000,bar:'copper_bar'},{ab:'Fe',nm:n('钢','Steel'),gold:5000,bar:'iron_bar'},
  {ab:'Au',nm:n('金','Gold'),gold:10000,bar:'gold_bar'},{ab:'Ir',nm:n('铱','Iridium'),gold:25000,bar:'iridium_bar'}
];
export const WEAPONS=[{nm:n('生锈的剑','Rusty Sword'),dmg:[2,5],gold:0},{nm:n('钢制小剑','Steel Smallsword'),dmg:[4,8],gold:500},{nm:n('银剑','Silver Saber'),dmg:[8,15],gold:1500},{nm:n('海盗剑','Cutlass'),dmg:[9,17],gold:3000},{nm:n('黑曜石刃','Obsidian Edge'),dmg:[30,45],gold:9000}];
export const RODS=[{nm:n('竹制鱼竿','Bamboo Pole'),gold:0,bar:0},{nm:n('训练鱼竿','Training Rod'),gold:25,bar:40},{nm:n('玻璃纤维鱼竿','Fiberglass Rod'),gold:1800,bar:14,bait:1},{nm:n('铱鱼竿','Iridium Rod'),gold:7500,bar:28,bait:1,tackle:1}];
export const ANIMALS={ chicken:{nm:n('鸡','Chicken'),cost:800,house:'coop',days:1,prod:'egg',big:'big_egg',em:'🐔'}, duck:{nm:n('鸭','Duck'),cost:1200,house:'coop',days:2,prod:'duck_egg',em:'🦆'}, cow:{nm:n('牛','Cow'),cost:1500,house:'barn',days:1,prod:'milk',big:'big_milk',em:'🐄'}, goat:{nm:n('山羊','Goat'),cost:4000,house:'barn',days:2,prod:'goat_milk',em:'🐐'}, sheep:{nm:n('绵羊','Sheep'),cost:8000,house:'barn',days:3,prod:'wool',em:'🐑'}, pig:{nm:n('猪','Pig'),cost:16000,house:'barn',days:1,prod:'truffle',em:'🐖'} };
export const BUILDINGS={ coop:{nm:n('鸡舍','Coop'),gold:4000,cost:{'mat:wood':300,'mat:stone':100},days:3}, barn:{nm:n('畜棚','Barn'),gold:6000,cost:{'mat:wood':350,'mat:stone':150},days:3}, silo:{nm:n('筒仓','Silo'),gold:100,cost:{'mat:stone':100,'mat:clay':10,'bar:copper_bar':5},days:3}, kitchen:{nm:n('房屋扩建(厨房)','House Upgrade (Kitchen)'),gold:10000,cost:{'mat:wood':450},days:3}, nursery:{nm:n('二次扩建(卧室)','Second Upgrade'),gold:50000,cost:{'mat:hardwood':150},days:3} };

/* villagers: original people. love/like are item keys or kind wildcards. sched: [minute, place]. */
export const NPCS=[
  {id:'mei',nm:n('小梅','Mei'),col:0xc86a80,style:2,role:n('杂货铺老板','shopkeeper'),bday:[0,4],spouse:true,love:['crop:cauliflower','forage:daffodil','crop:poppy'],like:['forage:*','crop:*'],hate:['ore:*'],sched:[[540,'store'],[1020,'plaza'],[1260,'homeA']]},
  {id:'ken',nm:n('阿健','Ken'),col:0x5a6a8a,style:1,role:n('铁匠','blacksmith'),bday:[3,16],love:['gem:ruby','ore:gold_ore','artisan:beer'],like:['bar:*','ore:*'],hate:['forage:*'],sched:[[540,'smith'],[960,'saloon'],[1320,'homeB']]},
  {id:'luna',nm:n('露娜','Luna'),col:0x7a5aa8,style:0,role:n('博物馆馆长','curator'),bday:[2,5],spouse:true,love:['gem:amethyst','food:pumpkin_pie','artifact:*'],like:['gem:*'],hate:['mat:slime'],sched:[[540,'museum'],[1020,'lake'],[1200,'homeC']]},
  {id:'tom',nm:n('老汤','Tom'),col:0x4a7a6a,style:3,role:n('渔夫','fisherman'),bday:[1,24],love:['fish:*','artisan:pale_ale'],like:['food:*'],hate:['mat:sap'],sched:[[420,'fishshop'],[960,'dock'],[1260,'homeD']]},
  {id:'rosa',nm:n('蔷薇','Rosa'),col:0xa84a4a,style:2,role:n('酒馆老板','innkeeper'),bday:[2,8],love:['food:pizza','artisan:wine'],like:['food:*','artisan:*'],hate:['mat:fiber'],sched:[[720,'saloon'],[1440,'homeE']]},
  {id:'hal',nm:n('阿哈','Hal'),col:0xb08a4a,style:1,role:n('木匠','carpenter'),bday:[0,20],spouse:true,love:['mat:hardwood','artisan:beer'],like:['mat:wood','mat:stone'],hate:['fish:*'],sched:[[540,'carpenter'],[1020,'saloon'],[1320,'homeF']]},
  {id:'nan',nm:n('南希','Nan'),col:0x8a7a3a,style:3,role:n('牧场主','rancher'),bday:[2,18],love:['artisan:cheese','crop:yam'],like:['product:*','crop:*'],hate:['ore:coal'],sched:[[540,'ranch'],[1140,'plaza'],[1260,'homeG']]},
  {id:'pip',nm:n('小皮','Pip'),col:0x5a9a5a,style:0,role:n('孩子','kid'),bday:[3,6],love:['food:pumpkin_pie','forage:wild_plum'],like:['forage:*'],hate:['mat:clay'],sched:[[600,'plaza'],[840,'river'],[1140,'homeA']]},
  {id:'ivy',nm:n('艾薇','Ivy'),col:0x4a8aa8,style:2,role:n('医生','doctor'),bday:[1,3],spouse:true,love:['crop:melon','food:salad'],like:['crop:*'],hate:['ore:*'],sched:[[540,'clinic'],[1020,'lake'],[1260,'homeH']]},
  {id:'leo',nm:n('里奥','Leo'),col:0x3a3a5a,style:1,role:n('镇长','mayor'),bday:[1,13],love:['artisan:wine','food:parsnip_soup'],like:['crop:*'],hate:['mat:bat_wing'],sched:[[540,'plaza'],[1080,'saloon'],[1320,'homeI']]},
  {id:'sora',nm:n('空','Sora'),col:0x7a4a8a,style:0,role:n('画家','painter'),bday:[0,27],spouse:true,love:['forage:sweet_pea','gem:jade'],like:['forage:*','gem:*'],hate:['fish:*'],sched:[[600,'falls'],[1020,'plaza'],[1260,'homeJ']]},
  {id:'finn',nm:n('阿芬','Finn'),col:0x3a7a9a,style:3,role:n('船夫','boatman'),bday:[3,24],spouse:true,love:['fish:salmon','artisan:pale_ale'],like:['fish:*','food:*'],hate:['forage:daffodil'],sched:[[480,'dock'],[1080,'lighthousePath'],[1320,'homeK']]}
];
export const LINES={
  0:{zh:['你是新来的农夫吧?欢迎来到星星露谷。','今天湖面真平静。','有空常来镇上走走。','听说瀑布那边的鳟鱼很肥。','春天的第一场雨总让人想起故乡。'],en:['You must be the new farmer. Welcome to StarVale.','The lake is so calm today.','Come by town when you can.','They say the trout by the falls are fat this year.','The first spring rain always makes me think of home.']},
  2:{zh:['你的农场越来越有样子了。','能和你聊聊天真好。','湖边的日落,我看不腻。','下次来记得带点你种的东西。'],en:['Your farm is shaping up.','It is nice to chat with you.','I never tire of the sunsets on the lake.','Bring something you grew next time.']},
  5:{zh:['见到你总是很开心。','我把你当成真正的朋友了。','你改变了这个小镇,你知道吗?','来,这是给你留的。'],en:['It always makes me happy to see you.','I think of you as a real friend now.','You have changed this town, you know.','Here, I saved this for you.']},
  8:{zh:['不知怎么,看到你今天就亮了。','有些话,一直想对你说。','我们一起看过的日落,我都记得。'],en:['Somehow my day brightens when I see you.','There is something I keep wanting to tell you.','I remember every sunset we watched.']}
};
export const HEART_EVENTS={ 2:n('你们坐在码头边聊了很久,关于这座小镇,也关于离开过的人。','You sat by the dock talking for a long while, about this town and those who left it.'), 4:n('雨天里,对方把伞分给了你一半。','In the rain you were offered half an umbrella.'), 6:n('对方给你看了一本旧相册,里面有这片湖几十年前的样子。','You were shown an old album of the lake as it looked decades ago.'), 8:n('傍晚的灯火里,对方说:“有你在,这里才像家。”','In the evening lamplight: "With you here, this feels like home."') };

/* community centre: bundles of items, each room pays out */
export const ROOMS=[
  {id:'pantry',nm:n('茶水间','Pantry'),reward:n('温室修复了!','The greenhouse is restored!'),unlock:'greenhouse',bundles:[
    {nm:n('春季作物','Spring Crops'),need:4,items:['crop:parsnip','crop:potato','crop:cauliflower','crop:green_bean']},
    {nm:n('夏季作物','Summer Crops'),need:4,items:['crop:tomato','crop:pepper','crop:blueberry','crop:melon']},
    {nm:n('秋季作物','Fall Crops'),need:4,items:['crop:corn','crop:eggplant','crop:pumpkin','crop:yam']},
    {nm:n('畜牧','Animal'),need:3,items:['product:milk','product:egg','product:wool','product:goat_milk']}]},
  {id:'crafts',nm:n('工艺室','Crafts Room'),reward:n('通往采石场的桥修好了!','The bridge to the quarry is repaired!'),unlock:'quarry',bundles:[
    {nm:n('春季采集','Spring Foraging'),need:4,items:['forage:horseradish','forage:daffodil','forage:leek','forage:dandelion']},
    {nm:n('夏季采集','Summer Foraging'),need:3,items:['forage:spice_berry','forage:wild_grape','forage:sweet_pea']},
    {nm:n('秋季采集','Fall Foraging'),need:4,items:['forage:mushroom','forage:wild_plum','forage:hazelnut','forage:blackberry']},
    {nm:n('建筑材料','Construction'),need:4,items:['mat:wood','mat:stone','mat:hardwood','mat:clay']}]},
  {id:'fish',nm:n('鱼缸','Fish Tank'),reward:n('矿车通往小镇各处了!','The minecarts run again!'),unlock:'minecart',bundles:[
    {nm:n('河鱼','River Fish'),need:4,items:['fish:sunfish','fish:catfish','fish:shad','fish:tiger_trout']},
    {nm:n('湖鱼','Lake Fish'),need:4,items:['fish:bass','fish:carp','fish:bullhead','fish:sturgeon']},
    {nm:n('夜钓','Night Fishing'),need:2,items:['fish:walleye','fish:bream','fish:midnight_carp']}]},
  {id:'boiler',nm:n('锅炉房','Boiler Room'),reward:n('矿洞的电梯恢复运行!','The mine lifts are powered!'),unlock:'lift',bundles:[
    {nm:n('铁匠','Blacksmith'),need:3,items:['bar:copper_bar','bar:iron_bar','bar:gold_bar']},
    {nm:n('地质学家','Geologist'),need:4,items:['gem:quartz','gem:amethyst','gem:topaz','gem:aquamarine']},
    {nm:n('冒险家','Adventurer'),need:3,items:['mat:slime','mat:bat_wing','mat:bug_meat']}]},
  {id:'board',nm:n('公告栏','Bulletin Board'),reward:n('村民们对你的好感都提升了!','Everyone in town warms to you!'),unlock:'friends',bundles:[
    {nm:n('厨师','Chef'),need:4,items:['food:fried_egg','food:bread','food:salad','food:pizza']},
    {nm:n('匠人','Artisan'),need:4,items:['artisan:cheese','artisan:mayo','artisan:wine','artisan:honey']}]}
];
export const MUSEUM_REWARDS=[[5,'seed:sunflower',3,n('向日葵种子','Sunflower Seeds')],[10,'gold',1000,n('1000 金币','1000 gold')],[15,'food:pumpkin_pie',1,n('南瓜派','Pumpkin Pie')],[20,'gem:gem',1,n('钻石','Diamond')]];

/* day, season, hours and what happens */
export const FESTIVALS=[
  {id:'egg',s:0,d:13,nm:n('复活蛋节','Egg Festival'),open:[540,840],kind:'egg',desc:n('在广场上找彩蛋,限时比赛!','Hunt painted eggs across the plaza before time runs out!')},
  {id:'flower',s:0,d:24,nm:n('花舞节','Flower Dance'),open:[540,840],kind:'dance',desc:n('邀请一位朋友跳舞(需要 4 颗心)。','Ask a friend to dance (needs 4 hearts).')},
  {id:'luau',s:1,d:11,nm:n('夏威夷宴会','Luau'),open:[540,840],kind:'soup',desc:n('往大锅里加一样你最好的食材。','Add your best ingredient to the great pot.')},
  {id:'jellies',s:1,d:28,nm:n('月光水母之舞','Moonlight Jellies'),open:[1320,1440],kind:'jellies',desc:n('到码头看发光的水母从湖面经过。','Go to the dock and watch the glowing jellies pass.')},
  {id:'fair',s:2,d:16,nm:n('星露谷展览会','Fall Fair'),open:[540,900],kind:'fair',desc:n('布置你的展台,赢星星币。','Dress your grange display and win tokens.')},
  {id:'spirit',s:2,d:27,nm:n('万灵节','Spirit\'s Eve'),open:[1320,1440],kind:'maze',desc:n('穿过雾中迷宫,找到金南瓜。','Find the golden pumpkin in the misty maze.')},
  {id:'ice',s:3,d:8,nm:n('冰雪节','Festival of Ice'),open:[540,840],kind:'icefish',desc:n('冰钓比赛:两分钟,钓得最多的人赢。','Ice-fishing contest: two minutes, most fish wins.')},
  {id:'market',s:3,d:16,nm:n('夜市','Night Market'),open:[1020,1440],kind:'market',desc:n('湖上的船坞夜市:稀有种子和小礼物。','Boat market on the lake: rare seeds and gifts.')},
  {id:'star',s:3,d:25,nm:n('冬日星盛宴','Feast of the Winter Star'),open:[540,840],kind:'gift',desc:n('一年的终点,和大家交换礼物。','The year ends with an exchange of gifts.')}
];
export const QUESTS=[
  {id:'intro_farm',nm:n('开垦土地','Till the land'),goal:{till:15},reward:100,msg:n('用锄头开垦 15 块土地。','Till 15 plots.')},
  {id:'intro_ship',nm:n('第一次收获','First harvest'),goal:{ship:1},reward:200,msg:n('把一样作物放进出货箱。','Put a crop in the shipping bin.')},
  {id:'intro_fish',nm:n('湖边的第一条鱼','First catch'),goal:{fish:1},reward:200,msg:n('钓到一条鱼。','Catch a fish.')},
  {id:'intro_mine',nm:n('下到矿洞','Into the mine'),goal:{floor:5},reward:300,msg:n('抵达矿洞第 5 层。','Reach mine floor 5.')},
  {id:'intro_friend',nm:n('认识大家','Meet everyone'),goal:{meet:6},reward:300,msg:n('和 6 位村民打招呼。','Talk to 6 villagers.')},
  {id:'intro_build',nm:n('安个家','Put down roots'),goal:{build:1},reward:500,msg:n('在木匠那里建一座农场建筑。','Commission a farm building.')}
];
