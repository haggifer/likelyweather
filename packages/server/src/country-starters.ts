// The four most populous places of each country, as GeoNames ids (the ids Open-Meteo's geocoding uses), for the
// "Start with" chips of a first visit. Generated on 2026-10-05 from GeoNames cities15000 (CC BY 4.0,
// https://www.geonames.org); sections of cities (PPLX) and historical places left out, and so is a place within 25 km
// of a larger one already chosen (New York's boroughs, for one).
export const COUNTRY_STARTERS: Record<string, number[]> = {
    AD: [3041563], // Andorra la Vella
    AE: [292223, 292968, 292672, 292913], // Dubai, Abu Dhabi, Sharjah, Al Ain City
    AF: [1138958, 1140026, 1138336, 1133616], // Kabul, Herāt, Kandahār, Mazār-e Sharīf
    AG: [3576022], // Saint John’s
    AI: [3573374], // The Valley
    AL: [3183875, 3185728, 3183719, 783263], // Tirana, Durrës, Vlorë, Elbasan
    AM: [616052, 616635, 616530, 616629], // Yerevan, Gyumri, Vanadzor, Hrazdan
    AO: [2240449, 2242906, 3347762, 3348313], // Luanda, Calumbo, Lubango, Huambo
    AR: [3435910, 3860259, 3838583, 3430863], // Buenos Aires, Córdoba, Rosario, Mar del Plata
    AS: [5881576], // Pago Pago
    AT: [2761369, 2778067, 2772400, 2766824], // Vienna, Graz, Linz, Salzburg
    AU: [2147714, 2158177, 2174003, 2063523], // Sydney, Melbourne, Brisbane, Perth
    AW: [3577154], // Oranjestad
    AX: [3041732], // Mariehamn
    AZ: [587084, 584923, 586523, 584649], // Baku, Sumgayit, Ganja, Yevlakh
    BA: [3191281, 3204541, 3186573, 3188582], // Sarajevo, Banja Luka, Zenica, Tuzla
    BB: [3374036], // Bridgetown
    BD: [1185241, 1205733, 1200109, 1336135], // Dhaka, Chattogram, Gazipur, Khulna
    BE: [2800866, 2803138, 2797656, 2800481], // Brussels, Antwerp, Gent, Charleroi
    BF: [2357048, 2362344, 2358946, 2357043], // Ouagadougou, Bobo-Dioulasso, Koudougou, Ouahigouya
    BG: [727011, 728193, 726050, 732770], // Sofia, Plovdiv, Varna, Burgas
    BH: [290332], // Al Muharraq
    BI: [425378, 426272, 430569, 423549], // Bujumbura, Gitega, Ngozi, Rumonge
    BJ: [2394819, 2392087, 2392204, 2395915], // Cotonou, Porto-Novo, Parakou, Abomey
    BL: [3579132], // Gustavia
    BM: [3573197], // Hamilton
    BN: [1820906, 1820491, 1820071], // Bandar Seri Begawan, Kuala Belait, Tutong
    BO: [3911925, 3904906, 3919968, 3903987], // La Paz, Santa Cruz de la Sierra, Cochabamba, Sucre
    BQ: [3513563], // Kralendijk
    BR: [3448439, 3451190, 3470127, 3450554], // São Paulo, Rio de Janeiro, Belo Horizonte, Salvador
    BS: [3571824, 3571971], // Nassau, Lucaya
    BT: [1252416, 1252484, 1252608, 1252479], // Thimphu, Phuntsholing, Tsirang, Punākha
    BW: [933773, 933778, 933366, 933305], // Gaborone, Francistown, Maun, Molepolole
    BY: [625144, 627907, 627904, 620127], // Minsk, Homyel', Hrodna, Vitebsk
    BZ: [3582677, 3581194, 3581164, 3581514], // Belize City, San Ignacio, San Pedro, Orange Walk
    CA: [6167865, 6077243, 5913490, 6094817], // Toronto, Montréal, Calgary, Ottawa
    CC: [7304591], // West Island
    CD: [2314302, 922704, 209228, 212730], // Kinshasa, Lubumbashi, Mbuji-Mayi, Kisangani
    CF: [2389853, 2387495, 2389086, 240604], // Bangui, Carnot, Berbérati, Bambari
    CG: [2260535, 2255414, 2258261, 8521334], // Brazzaville, Pointe-Noire, Dolisie, Nkayi
    CH: [2657896, 2660646, 2661604, 2659994], // Zürich, Geneva, Basel, Lausanne
    CI: [2293538, 2290956, 2286304, 2290486], // Abidjan, Bouaké, Korhogo, Daloa
    CK: [4035715], // Avarua
    CL: [3871336, 3899539, 3868121, 3874960], // Santiago, Antofagasta, Viña del Mar, Puerto Montt
    CM: [2232593, 2220957, 2234974, 2235189], // Douala, Yaoundé, Bamenda, Bafoussam
    CN: [1796236, 1814906, 1815286, 1816670], // Shanghai, Chongqing, Chengdu, Beijing
    CO: [3688689, 3687925, 3674962, 3689147], // Bogotá, Cali, Medellín, Barranquilla
    CR: [3621849, 3622247, 3623076, 3622547], // San José, Limón, Liberia, Paraíso
    CU: [3553478, 3536729, 3566067, 3556969], // Havana, Santiago de Cuba, Camagüey, Holguín
    CV: [3374333, 3374462, 8521418, 3374888], // Praia, Mindelo, Espargos, Assomada
    CW: [3513090], // Willemstad
    CX: [2078127], // Flying Fish Cove
    CY: [146268, 146384, 146400, 146617], // Nicosia, Limassol, Larnaca, Famagusta
    CZ: [3067696, 3078610, 3068799, 3068160], // Prague, Brno, Ostrava, Pilsen
    DE: [2950159, 2911298, 2867714, 2886242], // Berlin, Hamburg, Munich, Köln
    DJ: [223817, 225284, 223890, 220782], // Djibouti, Ali Sabih, Dikhil, Tadjoura
    DK: [2618425, 2624652, 2615876, 2624886], // Copenhagen, Århus, Odense, Aalborg
    DM: [3575635], // Roseau
    DO: [3492908, 3492914, 3493032, 3500957], // Santo Domingo, Santiago de los Caballeros, San Pedro de Macorís, La Romana
    DZ: [2507480, 2485926, 2501152, 2506999], // Algiers, Oran, Constantine, Annaba
    EC: [3652462, 3657509, 3658666, 3651297], // Quito, Guayaquil, Cuenca, Santo Domingo de los Colorados
    EE: [588409, 588335, 590031, 589580], // Tallinn, Tartu, Narva, Pärnu
    EG: [360630, 361058, 358619, 359796], // Cairo, Alexandria, Port Said, Suez
    EH: [2462881, 2463447, 2463029], // Laayoune, Dakhla, Boujdour
    ER: [343300, 333287, 334717, 344783], // Asmara, Keren, Himora, Af’abet
    ES: [3117735, 3128760, 2509954, 3104324], // Madrid, Barcelona, Valencia, Zaragoza
    ET: [344979, 333795, 336014, 331180], // Addis Ababa, Jijiga, Gonder, Mek'ele
    FI: [658225, 634963, 643492, 633679], // Helsinki, Tampere, Oulu, Turku
    FJ: [8740209, 2204506, 2204582, 2198365], // Nasinu, Lautoka, Labasa, Sigatoka
    FK: [3426691], // Stanley
    FM: [2081986], // Palikir
    FO: [2611396], // Tórshavn
    FR: [2988507, 2995469, 2996944, 2972315], // Paris, Marseille, Lyon, Toulouse
    GA: [2399697, 2396518, 2400555, 2396646], // Libreville, Port-Gentil, Franceville, Oyem
    GB: [2643743, 2655603, 2648579, 2643123], // London, Birmingham, Glasgow, Manchester
    GD: [3579925], // Saint George's
    GE: [611717, 615532, 613607, 611847], // Tbilisi, Batumi, Kutaisi, Sokhumi
    GF: [3382160, 3380387, 3381303], // Cayenne, Saint-Laurent-du-Maroni, Kourou
    GG: [3042287], // Saint Peter Port
    GH: [2298890, 2306104, 2294877, 2294915], // Kumasi, Accra, Tamale, Takoradi
    GI: [2411585], // Gibraltar
    GL: [3421319], // Nuuk
    GM: [2411989, 2412452, 2413515, 2412749], // Serekunda, Nema Kunku, Farafenni, Lamin
    GN: [2422465, 2416969, 2419992, 2417786], // Conakry, Nzérékoré, Kankan, Manéah
    GP: [3578959, 3579585], // Les Abymes, Capesterre-Belle-Eau
    GQ: [2310046, 2309527, 2309332, 2310309], // Bata, Malabo, Ebebiyin, Añisoc
    GR: [264371, 734077, 255683, 258576], // Athens, Thessaloníki, Pátra, Lárisa
    GS: [3426466], // Grytviken
    GT: [3598132, 3598119, 3590979, 3595237], // Guatemala City, Cobán, Quetzaltenango, Jalapa
    GU: [4043909], // Dededo Village
    GW: [2374775, 2372532, 2375254, 2368657], // Bissau, Gabú, Bafatá, Xitole
    GY: [3378644, 3377408, 3376762], // Georgetown, Linden, New Amsterdam
    HK: [1819729, 1818558], // Hong Kong, Tin Shui Wai
    HN: [3600949, 3601782, 3612907, 3608248], // Tegucigalpa, San Pedro Sula, Danlí, La Ceiba
    HR: [3186886, 3190261, 3191648, 3193935], // Zagreb, Split, Rijeka, Osijek
    HT: [3718426, 3718420, 3717588, 3726540], // Port-au-Prince, Port-de-Paix, Saint-Marc, Dessalines
    HU: [3054643, 721472, 715429, 717582], // Budapest, Debrecen, Szeged, Miskolc
    ID: [1642911, 1625822, 1650357, 1214520], // Jakarta, Surabaya, Bandung, Medan
    IE: [2964574, 2965140, 2962943, 2964180], // Dublin, Cork, Limerick, Galway
    IL: [281184, 293397, 294801, 294071], // Jerusalem, Tel Aviv, Haifa, Netanya
    IM: [3042237], // Douglas
    IN: [1275339, 1273294, 1277333, 1269843], // Mumbai, Delhi, Bengaluru, Hyderabad
    IQ: [98182, 99072, 95446, 99532], // Baghdad, Mosul, Erbil, Basrah
    IR: [112931, 124665, 418863, 128747], // Tehran, Mashhad, Isfahan, Karaj
    IS: [3413829, 8644037, 2633274], // Reykjavík, Reykjanesbær, Akureyri
    IT: [3169070, 3173435, 3172394, 3165524], // Rome, Milan, Naples, Turin
    JE: [3042091], // Saint Helier
    JM: [3489854, 3489460, 3489577, 3489523], // Kingston, Montego Bay, Mandeville, May Pen
    JO: [250441, 248946, 250799, 250774], // Amman, Irbid, ‘Ajlūn, Aqaba
    JP: [1850147, 1848354, 1853909, 1856057], // Tokyo, Yokohama, Osaka, Nagoya
    KE: [184745, 195272, 186301, 184622], // Nairobi, Kakamega, Mombasa, Nakuru
    KG: [1528675, 1527534, 1528249, 1528121], // Bishkek, Osh, Manas, Karakol
    KH: [1821306, 1821940, 1822214, 1831797], // Phnom Penh, Takeo, Siem Reap, Battambang
    KI: [2110257], // Tarawa
    KM: [921772, 921753, 921889], // Moroni, Moutsamoudou, Fomboni
    KN: [3575551], // Basseterre
    KP: [1871859, 1877449, 1873757, 1869012], // Pyongyang, Hamhŭng, Namp’o, Sunch’ŏn
    KR: [1835848, 1838524, 1843564, 1835329], // Seoul, Busan, Incheon, Daegu
    KW: [285839, 285629, 285799], // Al Aḩmadī, Ḩawallī, Al Jahrā’
    KY: [3580661], // George Town
    KZ: [1526384, 1526273, 1518980, 610611], // Almaty, Astana, Shymkent, Aktobe
    LA: [1651944, 1653316, 1655199, 1654379], // Vientiane, Savannakhet, Thakhèk, Pakse
    LB: [276781, 266826, 268064, 267008], // Beirut, Tripoli, Sidon, Tyre
    LC: [3576686], // Gros Islet
    LI: [3042030], // Vaduz
    LK: [1248991, 1242833, 1233369, 1241622], // Colombo, Jaffna, Negombo, Kandy
    LR: [2274895, 2277060, 2278158, 2277241], // Monrovia, Gbarnga, Buchanan, Ganta
    LS: [932505, 932521, 932438, 932614], // Maseru, Maputsoe, Mohale's Hoek, Mafeteng
    LT: [593116, 598316, 598098, 594739], // Vilnius, Kaunas, Klaipėda, Šiauliai
    LU: [2960316], // Luxembourg
    LV: [456172, 460413, 457954, 459279], // Riga, Daugavpils, Liepāja, Jelgava
    LY: [2210247, 88319, 2214846, 2208485], // Tripoli, Benghazi, Misratah, Zliten
    MA: [2553604, 2538475, 2548885, 2530335], // Casablanca, Rabat, Fes, Tangier
    MC: [2993458], // Monaco
    MD: [618426, 617239, 618605, 617486], // Chisinau, Tiraspol, Bălţi, Rîbniţa
    ME: [3193044, 3194494, 3199394, 3193161], // Podgorica, Nikšić, Herceg Novi, Pljevlja
    MF: [3578851], // Marigot
    MG: [1070940, 1053384, 1069166, 1062663], // Antananarivo, Toamasina, Antsirabe, Mahajanga
    MH: [2113779], // Majuro
    MK: [785842, 788886, 786735, 792578], // Skopje, Kumanovo, Prilep, Bitola
    ML: [2460596, 2451185, 2454268, 2451478], // Bamako, Sikasso, Koutiala, Ségou
    MM: [1298824, 1311874, 6611854, 1308465], // Yangon, Mandalay, Nay Pyi Taw, Mawlamyine
    MN: [2028462, 2031405, 2031964, 2032054], // Ulan Bator, Erdenet, Darhan, Choibalsan
    MO: [1821274], // Macau
    MP: [7828758], // Saipan
    MQ: [3570675], // Fort-de-France
    MR: [2377450, 2377457, 2378538, 2377539], // Nouakchott, Nouadhibou, Kiffa, Néma
    MS: [7266440], // Brades
    MT: [2562541], // San Pawl il-Baħar
    MU: [934154, 934750], // Port Louis, Bel Air Rivière Sèche
    MV: [1282027], // Male
    MW: [927967, 931755, 925475, 923295], // Lilongwe, Blantyre, Mzuzu, Zomba
    MX: [3530597, 3981609, 3521081, 3991164], // Mexico City, Tijuana, Puebla, Santiago de Querétaro
    MY: [1735161, 1732752, 1734634, 1734759], // Kuala Lumpur, Johor Bahru, Ipoh, Malacca
    MZ: [1040652, 1033356, 1052373, 1049261], // Maputo, Nampula, Beira, Chimoio
    NA: [3352136, 3353383, 3359638, 3352844], // Windhoek, Rundu, Walvis Bay, Swakopmund
    NC: [2139521], // Nouméa
    NE: [2440485, 2441291, 2437798, 2439376], // Niamey, Maradi, Zinder, Tahoua
    NF: [2161314], // Kingston
    NG: [2332459, 2335204, 2339354, 2352778], // Lagos, Kano, Ibadan, Abuja
    NI: [3617763, 3618030, 3620381, 3617708], // Managua, León, Chinandega, Matagalpa
    NL: [2747891, 2759794, 2745912, 2755251], // Rotterdam, Amsterdam, Utrecht, Groningen
    NO: [3143244, 3161732, 3133880, 3137115], // Oslo, Bergen, Trondheim, Stavanger
    NP: [1283240, 1282898, 1283613, 1283581], // Kathmandu, Pokhara, Bharatpur, Birgañj
    NR: [7626461], // Yaren
    NU: [4036284], // Alofi
    NZ: [2193733, 2192362, 2179537, 2190324], // Auckland, Christchurch, Wellington, Hamilton
    OM: [287286, 287830, 286621, 286647], // Muscat, ‘Ibrī, Şalālah, Şaḩam
    PA: [3703443, 3711668, 3712076, 3707961], // Panama City, David, Colón, La Chorrera
    PE: [3936456, 3947322, 3691175, 3693528], // Lima, Arequipa, Trujillo, Piura
    PF: [4034561], // Faaa
    PG: [2088122, 2092740, 2100633, 2090409], // Port Moresby, Lae, Arawa, Mount Hagen
    PH: [1692192, 1715348, 1723510, 1679432], // Quezon City, Davao, Budta, Zamboanga
    PK: [1172451, 1174872, 1168197, 1179400], // Lahore, Karachi, Peshawar, Faisalabad
    PL: [756135, 3094802, 3081368, 3093133], // Warsaw, Kraków, Wrocław, Łódź
    PM: [3424934], // Saint-Pierre
    PN: [4030723], // Adamstown
    PR: [4568127, 4566880, 4562635, 4563008], // San Juan, Ponce, Arecibo, Caguas
    PS: [281133, 285066, 282615, 281102], // Gaza, Hebron, Nablus, Rafaḩ
    PT: [2267057, 2735943, 2742032, 2740637], // Lisbon, Porto, Braga, Coimbra
    PW: [8063361], // Ngerulmud
    PY: [3439389, 3439101, 3437547, 3438735], // Asunción, Ciudad del Este, Pedro Juan Caballero, Encarnación
    QA: [290030, 289847, 289545], // Doha, Az̧ Z̧a‘āyin, Umm Ghuwaylīnah
    RE: [935264, 935214, 935267, 935225], // Saint-Denis, Saint-Pierre, Saint-Benoît, Saint-Leu
    RO: [683506, 675810, 680963, 681290], // Bucharest, Iaşi, Constanţa, Cluj-Napoca
    RS: [792680, 787657, 3194360, 789128], // Belgrade, Niš, Novi Sad, Kragujevac
    RU: [524901, 498817, 1496747, 1486209], // Moscow, Saint Petersburg, Novosibirsk, Yekaterinburg
    RW: [202061, 202905, 201521, 201650], // Kigali, Gisenyi, Musanze, Nyagatare
    SA: [105343, 108410, 104515, 109223], // Jeddah, Riyadh, Makkah, Madinah
    SB: [2108502], // Honiara
    SC: [241131], // Victoria
    SD: [379252, 369004, 377039, 372753], // Khartoum, Nyala, Port Sudan, Kassala
    SE: [2673730, 2711537, 2692969, 2666199], // Stockholm, Gothenburg, Malmö, Uppsala
    SG: [1880252], // Singapore
    SH: [3370903], // Jamestown
    SI: [3196359, 3195506, 3202781, 3197753], // Ljubljana, Maribor, Celje, Koper
    SJ: [2729907], // Longyearbyen
    SK: [3060972, 724443, 3058531, 723819], // Bratislava, Košice, Nitra, Prešov
    SL: [2409306, 2407790, 2410048, 2407656], // Freetown, Kenema, Bo, Koidu
    SM: [3168070], // San Marino
    SN: [2253354, 2244322, 2244802, 2250805], // Dakar, Touba, Thiès, Kaolack
    SO: [53654, 64021, 57289, 64435], // Mogadishu, Borama, Hargeysa, Berbera
    SR: [3383330], // Paramaribo
    SS: [373303, 363807, 363619, 370737], // Juba, Winejok, Yei, Malakal
    ST: [2410763], // São Tomé
    SV: [3583361, 3583446, 3583334, 3583102], // San Salvador, San Miguel, Santa Ana, Sonsonate
    SX: [3513392], // Philipsburg
    SY: [170063, 170654, 169577, 173576], // Aleppo, Damascus, Homs, Latakia
    SZ: [934995, 934985], // Manzini, Mbabane
    TC: [11703857, 3576994], // Providenciales, Cockburn Town
    TD: [2427123, 2427455, 245785, 2425791], // N'Djamena, Moundou, Abéché, Sarh
    TF: [1546102], // Port-aux-Français
    TG: [2365267, 2364104, 2366152, 2367886], // Lomé, Sokodé, Kara, Atakpamé
    TH: [1609350, 1611110, 1610780, 13494069], // Bangkok, Chon Buri, Hat Yai, Khlong Sam Wa
    TJ: [1221874, 1514896, 1220253, 1221194], // Dushanbe, Isfara, Istaravshan, Kŭlob
    TL: [1645457, 1636670, 1626459, 1637730], // Dili, Maliana, Suai, Likisá
    TM: [162183, 1219649, 601734, 1218667], // Ashgabat, Türkmenabat, Daşoguz, Mary
    TN: [2464470, 2467454, 2464915, 2473449], // Tunis, Sfax, Sousse, Kairouan
    TO: [4032402], // Nuku‘alofa
    TR: [745044, 323786, 750269, 311046], // Istanbul, Ankara, Bursa, İzmir
    TT: [3574810, 3574116, 3573840, 3574636], // Chaguanas, Mon Repos, Rio Claro, Diego Martin
    TV: [2110394], // Funafuti
    TW: [1668341, 1668399, 1673820, 1668355], // Taipei, Taichung, Kaohsiung, Tainan
    TZ: [160263, 152224, 160196, 148730], // Dar es Salaam, Mwanza, Dodoma, Zanzibar
    UA: [703448, 706483, 698740, 709930], // Kyiv, Kharkiv, Odesa, Dnipro
    UG: [232422, 229268, 227812, 233346], // Kampala, Mbarara, Njeru, Gulu
    US: [5128581, 5368361, 4887398, 4699066], // New York City, Los Angeles, Chicago, Houston
    UY: [3441575, 3440714, 3441894, 3440781], // Montevideo, Salto, Maldonado, Rivera
    UZ: [1512569, 1514588, 1513157, 1216265], // Tashkent, Andijon, Namangan, Samarkand
    VA: [6691831], // Vatican City
    VC: [3577887], // Kingstown
    VE: [3646738, 3633009, 3625549, 3648522], // Caracas, Maracaibo, Valencia, Barquisimeto
    VG: [3577430], // Road Town
    VI: [4796512, 4795467], // Saint Croix, Charlotte Amalie
    VN: [1566083, 1581130, 1581298, 1586203], // Ho Chi Minh City, Hanoi, Haiphong, Cần Thơ
    VU: [2135171], // Port-Vila
    WF: [4034821], // Mata-Utu
    WS: [4035413], // Apia
    XK: [786714, 786712, 789225, 791646], // Pristina, Prizren, Mitrovicë, Gjakovë
    YE: [71137, 415189, 70225, 74477], // Sanaa, Aden, Taiz, Ibb
    YT: [921815], // Mamoudzou
    ZA: [993800, 3369157, 1007311, 964137], // Johannesburg, Cape Town, Durban, Pretoria
    ZM: [909137, 911148, 901344, 918702], // Lusaka, Kitwe, Ndola, Chipata
    ZW: [890299, 894701, 884979, 890422], // Harare, Bulawayo, Mutare, Gweru
}
