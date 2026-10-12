// Valores e compatibilidades das wikis oficiais; fontes individuais em cada entrada.
window.EFFECT_LABELS={"hpPct": "HP máximo", "hp": "HP", "attackSpeed": "Rapidez de ataque", "attack": "Valor de ataque", "defense": "Defesa", "crit": "Críticos", "pierce": "Furos", "magicResist": "Resistência a magia", "monster": "Forte contra monstros", "metin": "Forte contra Metins", "meleeMagic": "Ataque corpo a corpo/mágico", "damageAttackPct": "Valor de ataque (dano)", "magicAttack": "Ataque mágico", "skillDamage": "Dano de habilidade", "powerAll": "Poder elemental", "dark": "Resistência a trevas", "skillResist": "Resistência a habilidades", "human": "Semi-humanos", "str": "FRÇ", "ddHp": "HP do Deus Dragão", "defensePct": "Defesa (redução de dano)"};
window.SPECIAL_EFFECTS=[
  {
    "id": "nazar",
    "name": "Amuleto de Nazar",
    "stats": {
      "meleeMagic": 30,
      "monster": 10,
      "attackSpeed": 20
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Amuleto_de_Nazar",
    "note": "",
    "image": "assets/effect-nazar.png"
  },
  {
    "id": "hero",
    "name": "Medalha do Herói",
    "stats": {
      "damageAttackPct": 30,
      "attackSpeed": 20,
      "hpPct": 10
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Medalha_do_Herói",
    "note": "Bónus disfarce +5%: amplificação dos trajes ainda não modelada.",
    "image": "assets/effect-hero.png"
  },
  {
    "id": "powerCandy",
    "name": "Doce do Poder",
    "stats": {
      "monster": 10,
      "attackSpeed": 20,
      "hpPct": 10
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Doce_do_Poder",
    "note": "",
    "image": "assets/effect-powerCandy.png"
  },
  {
    "id": "strongCandy",
    "name": "Doce Poderoso",
    "stats": {
      "damageAttackPct": 30,
      "attackSpeed": 20,
      "hpPct": 10
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Doce_Poderoso",
    "note": "",
    "image": "assets/effect-strongCandy.png"
  },
  {
    "id": "magicCandy",
    "name": "Doce Mágico",
    "stats": {
      "magicAttack": 30,
      "attackSpeed": 20,
      "hpPct": 10
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Doce_Mágico",
    "note": "",
    "image": "assets/effect-magicCandy.png"
  },
  {
    "id": "joy",
    "name": "Anel da Alegria",
    "stats": {
      "monster": 30,
      "attackSpeed": 20,
      "hpPct": 10
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Anel_da_Alegria",
    "note": "",
    "image": "assets/effect-joy.png"
  },
  {
    "id": "chocolate",
    "name": "Amuleto de Chocolate",
    "stats": {
      "monster": 10,
      "attackSpeed": 20,
      "hpPct": 10
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Amuleto_de_Chocolate",
    "note": "",
    "image": "assets/effect-chocolate.png"
  },
  {
    "id": "love",
    "name": "Amuleto do Amor Eterno",
    "stats": {
      "monster": 10,
      "attackSpeed": 20,
      "hpPct": 5
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Amuleto_do_Amor_Eterno",
    "note": "",
    "image": "assets/effect-love.png"
  },
  {
    "id": "crescent",
    "name": "Anel Lua Crescente",
    "stats": {
      "damageAttackPct": 30,
      "attackSpeed": 20,
      "hpPct": 10
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Anel_Lua_Crescente",
    "note": "",
    "image": "assets/effect-crescent.png"
  },
  {
    "id": "mortal",
    "name": "Anel do Poder Mortal",
    "stats": {
      "monster": 30,
      "hpPct": 10
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Anel_do_Poder_Mortal",
    "note": "Resistências de classes são registadas no item; simulação inicial só PvM.",
    "image": "assets/effect-mortal.png"
  },
  {
    "id": "will",
    "name": "Anel da Força de Vontade",
    "stats": {
      "monster": 30,
      "hpPct": 10
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Anel_da_Força_de_Vontade",
    "note": "Resistências de classes são registadas no item; simulação inicial só PvM.",
    "image": "assets/effect-will.png"
  },
  {
    "id": "guardian",
    "name": "Amuleto dos Guardiões",
    "stats": {
      "meleeMagic": 30,
      "attackSpeed": 20,
      "human": 10,
      "skillResist": 10
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Amuleto_dos_Guardiões",
    "note": "",
    "image": "assets/effect-guardian.png"
  },
  {
    "id": "blessing",
    "name": "Bênção do Poder",
    "stats": {
      "attackSpeed": 5,
      "metin": 10,
      "skillDamage": 40
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Bênção_do_Poder",
    "note": "",
    "image": "assets/effect-blessing.png"
  },
  {
    "id": "tigerEarring",
    "name": "Brinco Osso de Tigre",
    "stats": {
      "attack": 200
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Brinco_Osso_de_Tigre",
    "note": "",
    "image": "assets/effect-tigerEarring.png"
  },
  {
    "id": "dragonEarring",
    "name": "Brinco Osso de Dragão",
    "stats": {
      "defense": 200
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Brinco_Osso_de_Dragão",
    "note": "",
    "image": "assets/effect-dragonEarring.png"
  },
  {
    "id": "tigerBracelet",
    "name": "Pulseira Osso de Tigre",
    "stats": {
      "skillDamage": 15
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Pulseira_Osso_de_Tigre",
    "note": "",
    "image": "assets/effect-tigerBracelet.png"
  },
  {
    "id": "dragonBracelet",
    "name": "Pulseira Osso de Dragão",
    "stats": {
      "skillResist": 15
    },
    "group": "exclusive",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Pulseira_Osso_de_Dragão",
    "note": "",
    "image": "assets/effect-dragonBracelet.png"
  },
  {
    "id": "elementPower",
    "name": "Pedra Poder Elemental",
    "stats": {
      "powerAll": 10
    },
    "group": "compatible",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Pedra_Poder_Elemental",
    "note": "",
    "image": "assets/effect-elementPower.png"
  },
  {
    "id": "elementDefense",
    "name": "Pedra Defesa Elemental",
    "stats": {
      "fire": 10,
      "lightning": 10,
      "wind": 10,
      "ice": 10,
      "earth": 10,
      "dark": 10
    },
    "group": "compatible",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Pedra_Defesa_Elemental",
    "note": "",
    "image": "assets/effect-elementDefense.png"
  },
  {
    "id": "tournament",
    "name": "Emblema do Torneio",
    "stats": {
      "meleeMagic": 35,
      "attackSpeed": 20,
      "hpPct": 10
    },
    "group": "compatible",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Emblema_do_Torneio",
    "note": "",
    "image": "assets/effect-tournament.png"
  },
  {
    "id": "nezerath",
    "name": "Cabeça de Nezerath",
    "stats": {
      "meleeMagic": 15,
      "dark": 20,
      "hp": 1000
    },
    "group": "compatible",
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Cabeça_de_Nezerath",
    "note": "",
    "image": "assets/effect-nezerath.png"
  }
];
window.CONSUMABLE_EFFECTS=[
  {
    "id": "critical",
    "name": "Golpe Crítico",
    "key": "crit",
    "value": 20,
    "group": "Golpes",
    "level": 1,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Golpe_Crítico",
    "note": "",
    "image": "assets/effect-critical.png"
  },
  {
    "id": "piercing",
    "name": "Golpe Perfurador",
    "key": "pierce",
    "value": 20,
    "group": "Golpes",
    "level": 1,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Golpe_Perfurador",
    "note": "",
    "image": "assets/effect-piercing.png"
  },
  {
    "id": "sim",
    "name": "Água Sim",
    "key": "pierce",
    "value": 10,
    "group": "Águas",
    "level": 32,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Água_Sim",
    "note": "",
    "image": "assets/effect-sim.png"
  },
  {
    "id": "dok",
    "name": "Água Dok",
    "key": "crit",
    "value": 10,
    "group": "Águas",
    "level": 36,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Água_Dok",
    "note": "",
    "image": "assets/effect-dok.png"
  },
  {
    "id": "zin",
    "name": "Água Zin",
    "key": "attack",
    "value": 50,
    "group": "Águas",
    "level": 46,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Água_Zin",
    "note": "",
    "image": "assets/effect-zin.png"
  },
  {
    "id": "sambo",
    "name": "Água Sambo",
    "key": "defense",
    "value": 70,
    "group": "Águas",
    "level": 48,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Água_Sambo",
    "note": "",
    "image": "assets/effect-sambo.png"
  },
  {
    "id": "mong",
    "name": "Água Mong",
    "key": "magicResist",
    "value": 10,
    "group": "Águas",
    "level": 50,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Água_Mong",
    "note": "",
    "image": "assets/effect-mong.png"
  },
  {
    "id": "hwal",
    "name": "Água Hwal",
    "key": "attackSpeed",
    "value": 3,
    "group": "Águas",
    "level": 52,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Água_Hwal",
    "note": "",
    "image": "assets/effect-hwal.png"
  },
  {
    "id": "dewOrange",
    "name": "Orvalho Laranja",
    "key": "pierce",
    "value": 20,
    "group": "Orvalhos",
    "level": 55,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Orvalho_Laranja",
    "note": "",
    "min": 8,
    "max": 20
  },
  {
    "id": "dewRed",
    "name": "Orvalho Vermelho",
    "key": "crit",
    "value": 20,
    "group": "Orvalhos",
    "level": 55,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Orvalho_Vermelho",
    "note": "",
    "min": 8,
    "max": 20,
    "image": "assets/effect-dewRed.png"
  },
  {
    "id": "dewBlue",
    "name": "Orvalho Azul",
    "key": "attack",
    "value": 120,
    "group": "Orvalhos",
    "level": 55,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Orvalho_Azul",
    "note": "",
    "min": 30,
    "max": 120,
    "image": "assets/effect-dewBlue.png"
  },
  {
    "id": "dewWhite",
    "name": "Orvalho Branco",
    "key": "defense",
    "value": 200,
    "group": "Orvalhos",
    "level": 55,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Orvalho_Branco",
    "note": "",
    "min": 40,
    "max": 200,
    "image": "assets/effect-dewWhite.png"
  },
  {
    "id": "dewGreen",
    "name": "Orvalho Verde",
    "key": "magicResist",
    "value": 20,
    "group": "Orvalhos",
    "level": 55,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Orvalho_Verde",
    "note": "",
    "min": 8,
    "max": 20,
    "image": "assets/effect-dewGreen.png"
  },
  {
    "id": "dewYellow",
    "name": "Orvalho Amarelo",
    "key": "attackSpeed",
    "value": 8,
    "group": "Orvalhos",
    "level": 55,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Orvalho_Amarelo",
    "note": "",
    "min": 2,
    "max": 8
  },
  {
    "id": "green",
    "name": "Poção Verde",
    "key": "attackSpeed",
    "value": 30,
    "group": "Poções",
    "level": 1,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Poção_Verde",
    "note": "Escolhe P (+10), M (+20) ou G (+30).",
    "min": 10,
    "max": 30,
    "values": [
      10,
      20,
      30
    ]
  },
  {
    "id": "attackPotion",
    "name": "Poção de Ataque",
    "key": "attackSpeed",
    "value": 15,
    "group": "Poções",
    "level": 1,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Poção_de_Ataque",
    "note": "Esta poção aumenta rapidez de ataque, não valor de ataque.",
    "min": 10,
    "max": 15,
    "values": [
      10,
      15
    ]
  },
  {
    "id": "ddAttack",
    "name": "Ataque do Deus Dragão",
    "key": "meleeMagic",
    "value": 20,
    "group": "Deus Dragão",
    "level": 1,
    "source": "https://fr-wiki.metin2.gameforge.com/index.php/Attaque_du_Dieu_Dragon",
    "note": "Wiki FR atual: +20% corpo a corpo/mágico. Wiki PT antiga descreve 12–15% de dano."
  },
  {
    "id": "ddLife",
    "name": "Vida do Deus Dragão",
    "key": "hpPct",
    "value": 20,
    "group": "Deus Dragão",
    "level": 1,
    "source": "https://pt-wiki.metin2.gameforge.com/index.php/Vida_do_Deus_Dragão",
    "note": "Aplica-se ao HP base; o conjunto dos bónus HP % tem um limite de +3500 HP (wiki FR).",
    "image": "assets/effect-ddLife.png"
  }
];
