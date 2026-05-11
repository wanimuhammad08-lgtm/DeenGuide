const NAMES_DETAILS = [
  { 
    num: 1, ar: "ٱلرَّحْمَـٰنُ", en: "The Most Gracious", tr: "Ar-Rahman",
    desc: "He who has an abundance of mercy for all of creation.",
    quran: [{ ref: "Al-Fatihah 1:3", text: "The Entirely Merciful, the Especially Merciful." }],
    hadith: [{ ref: "Sahih al-Bukhari 7404", text: "Allah has divided mercy into one hundred parts; and He kept its ninety-nine parts with Him and sent down its one part on the earth..." }]
  },
  { 
    num: 2, ar: "ٱلرَّحِيمُ", en: "The Most Merciful", tr: "Ar-Rahim",
    desc: "He who acts with extreme kindness, specifically to the believers.",
    quran: [{ ref: "Al-Baqarah 2:163", text: "And your god is one God. There is no deity [worthy of worship] except Him, the Entirely Merciful, the Especially Merciful." }],
    hadith: [{ ref: "Sunan Ibn Majah 4299", text: "The Messenger of Allah (ﷺ) said: 'Allah is more merciful to His slaves than this mother is to her child.'" }]
  },
  { 
    num: 3, ar: "ٱلْمَلِكُ", en: "The King", tr: "Al-Malik",
    desc: "The Sovereign Lord, the One with the complete dominion, the One Whose dominion is clear from imperfection.",
    quran: [{ ref: "Ta-Ha 20:114", text: "So high [above all] is Allah, the Sovereign, the Truth." }],
    hadith: [{ ref: "Sahih Muslim 2788", text: "Allah will fold the heavens on the Day of Resurrection... and will say: I am the King. Where are the tyrants? Where are the arrogant?" }]
  },
  { 
    num: 4, ar: "ٱلْقُدُّوسُ", en: "The Most Holy", tr: "Al-Quddus",
    desc: "The Pure One, the Most Holy, the One who is pure from any imperfection and clear from children and adversaries.",
    quran: [{ ref: "Al-Hashr 59:23", text: "He is Allah, other than whom there is no deity, the Sovereign, the Pure, the Perfection..." }],
    hadith: [{ ref: "Sunan an-Nasa'i 1699", text: "The Prophet (ﷺ) used to say in his bowing and prostrating: 'Subbun Quddusun, Rabbul-mala'ikati war-Ruh' (Glorious, Holy, Lord of the angels and the Spirit)." }]
  },
  { 
    num: 5, ar: "ٱلسَّلَامُ", en: "The Source of Peace", tr: "As-Salam",
    desc: "The One who is free from every imperfection, and the source of all peace and safety.",
    quran: [{ ref: "Al-Hashr 59:23", text: "...the Sovereign, the Pure, the Perfection, the Bestower of Faith, the Overseer..." }],
    hadith: [{ ref: "Sahih Muslim 591", text: "When the Messenger of Allah (ﷺ) finished his prayer, he begged forgiveness three times and said: 'O Allah, You are As-Salam and from You is all peace...'" }]
  },
  { num: 6, ar: "ٱلْمُؤْمِنُ", en: "The Guardian of Faith", tr: "Al-Mu'min",
    desc: "The One who witnessed for Himself that no one is god but Him, and who gives security and faith to His servants.",
    quran: [{ ref: "Al-Hashr 59:23", text: "He is Allah, other than whom there is no deity... the Bestower of Faith, the Overseer." }],
    hadith: [{ ref: "Sahih Muslim 2747", text: "Allah is more pleased with the repentance of His servant than one of you who finds his lost camel in a barren land." }]
  },
  { num: 7, ar: "ٱلْمُهَيْمِنُ", en: "The Protector", tr: "Al-Muhaymin",
    desc: "The One who witnesses the sayings and deeds of His creatures, the Guardian over all things.",
    quran: [{ ref: "Al-Hashr 59:23", text: "...the Bestower of Faith, the Overseer (Al-Muhaymin). Exalted is Allah above whatever they associate with Him." }],
    hadith: [{ ref: "Sahih al-Bukhari 7405", text: "Allah's Hand is full, and it is not diminished by spending day and night." }]
  },
  { num: 8, ar: "ٱلْعَزِيزُ", en: "The Almighty", tr: "Al-Aziz",
    desc: "The Mighty One, the Defeater who is never defeated, the One with supreme power.",
    quran: [{ ref: "Aal-e-Imran 3:6", text: "There is no deity except Him, the Exalted in Might (Al-Aziz), the Wise." }],
    hadith: [{ ref: "Sahih Muslim 2717", text: "O Allah, You are the first: there is nothing before You; and You are the last: there is nothing after You." }]
  },
  { num: 9, ar: "ٱلْجَبَّارُ", en: "The Compeller", tr: "Al-Jabbar",
    desc: "The One that nothing happens in His dominion except what He wills. He mends the broken and enriches the poor.",
    quran: [{ ref: "Al-Hashr 59:23", text: "...the Exalted in Might, the Compeller, the Superior. Exalted is Allah above whatever they associate with Him." }],
    hadith: [{ ref: "Sunan Abu Dawud 4699", text: "The heavens and the earth are in the hand of Ar-Rahman. He contracts and expands them." }]
  },
  { num: 10, ar: "ٱلْمُتَكَبِّرُ", en: "The Supreme", tr: "Al-Mutakabbir",
    desc: "The One who is clear from the attributes of the creatures and from resembling them. Greatness belongs to Him alone.",
    quran: [{ ref: "Al-Hashr 59:23", text: "...the Compeller, the Superior (Al-Mutakabbir). Exalted is Allah above whatever they associate with Him." }],
    hadith: [{ ref: "Sahih Muslim 2620", text: "Pride is His cloak and Greatness is His garment, and He who competes with Me in respect of either of them, I shall cast him into the Fire." }]
  },
  { num: 11, ar: "ٱلْخَالِقُ", en: "The Creator", tr: "Al-Khaliq",
    desc: "The One who brings everything from non-existence to existence, the Creator of all things.",
    quran: [{ ref: "Al-Hashr 59:24", text: "He is Allah, the Creator, the Inventor, the Fashioner; to Him belong the best names." }],
    hadith: [{ ref: "Sahih al-Bukhari 3207", text: "Allah created mercy in one hundred parts and sent down one part to the earth." }]
  },
  { num: 12, ar: "ٱلْبَارِئُ", en: "The Originator", tr: "Al-Bari'",
    desc: "The Maker, the One who creates forms out of nothing, who gives each thing its distinct existence.",
    quran: [{ ref: "Al-Baqarah 2:54", text: "So turn in repentance to your Creator (Bari'ikum) and kill yourselves. That is best for you in the sight of your Creator." }],
    hadith: [{ ref: "Sahih Muslim 2653", text: "Allah created His creation in darkness, then He cast His light upon them." }]
  },
  { num: 13, ar: "ٱلْمُصَوِّرُ", en: "The Fashioner", tr: "Al-Musawwir",
    desc: "The One who forms and shapes all things, giving each its own unique form and appearance.",
    quran: [{ ref: "Al-Hashr 59:24", text: "He is Allah, the Creator, the Inventor, the Fashioner (Al-Musawwir); to Him belong the best names." }],
    hadith: [{ ref: "Sahih al-Bukhari 5953", text: "The Prophet (ﷺ) said: Verily Allah is Beautiful and He loves beauty." }]
  },
  { num: 14, ar: "ٱلْغَفَّارُ", en: "The Forgiver", tr: "Al-Ghaffar",
    desc: "The One who forgives the sins of His servants time and time again, covering and overlooking their faults.",
    quran: [{ ref: "Nuh 71:10", text: "And said, 'Ask forgiveness of your Lord. Indeed, He is ever a Perpetual Forgiver.'" }],
    hadith: [{ ref: "Sahih Muslim 2749", text: "By Him in Whose Hand is my life, if you were not to commit sin, Allah would sweep you away and create people who would commit sin and seek His forgiveness." }]
  },
  { num: 15, ar: "ٱلْقَهَّارُ", en: "The Subduer", tr: "Al-Qahhar",
    desc: "The One who prevails over all creation. Nothing is beyond His power and all submit to His will.",
    quran: [{ ref: "Az-Zumar 39:4", text: "He is Allah, the One, the Prevailing (Al-Qahhar)." }],
    hadith: [{ ref: "Sahih Muslim 2788", text: "Allah will fold the heavens on the Day of Resurrection, then He will say: I am the King." }]
  },
  { num: 16, ar: "ٱلْوَهَّابُ", en: "The Bestower", tr: "Al-Wahhab",
    desc: "The One who gives freely without expecting anything in return. His gifts are abundant and continuous.",
    quran: [{ ref: "Aal-e-Imran 3:8", text: "Our Lord, let not our hearts deviate after You have guided us and grant us from Yourself mercy. Indeed, You are the Bestower." }],
    hadith: [{ ref: "Sahih al-Bukhari 7405", text: "Allah's Hand is full, spending does not diminish it. He gives by night and day." }]
  },
  { num: 17, ar: "ٱلرَّزَّاقُ", en: "The Provider", tr: "Ar-Razzaq",
    desc: "The One who provides sustenance to all of His creation. He creates all means of nourishment.",
    quran: [{ ref: "Adh-Dhariyat 51:58", text: "Indeed, it is Allah who is the Provider, the firm possessor of strength." }],
    hadith: [{ ref: "Sunan at-Tirmidhi 2344", text: "If you were to rely upon Allah with the reliance He is due, He would provide for you just as He provides for the birds." }]
  },
  { num: 18, ar: "ٱلْفَتَّاحُ", en: "The Opener", tr: "Al-Fattah",
    desc: "The One who opens the doors of mercy, sustenance, and solutions to all problems for His creatures.",
    quran: [{ ref: "Saba 34:26", text: "Say: Our Lord will bring us together; then He will judge between us in truth. And He is the Knowing Judge (Al-Fattah)." }],
    hadith: [{ ref: "Sahih al-Bukhari 6316", text: "The Prophet (ﷺ) used to say when he got up at night to pray: 'O Allah, Lord of Jibril, Mika'il and Israfil...'" }]
  },
  { num: 19, ar: "ٱلْعَلِيمُ", en: "The All-Knowing", tr: "Al-'Alim",
    desc: "The One whose knowledge encompasses all things, the seen and the unseen, the past, present and future.",
    quran: [{ ref: "Al-Baqarah 2:29", text: "He it is who created for you all that is on earth. Then He turned to the heaven... And He is the Knower of all things." }],
    hadith: [{ ref: "Sahih Muslim 2713", text: "O Allah, by Your knowledge of the unseen and Your power over creation, keep me alive so long as You know that living is good for me." }]
  },
  { num: 20, ar: "ٱلْقَابِضُ", en: "The Restrainer", tr: "Al-Qabid",
    desc: "The One who constricts the sustenance by His Wisdom, and tests by doing so.",
    quran: [{ ref: "Al-Baqarah 2:245", text: "Allah withholds and grants abundance, and to Him you will be returned." }],
    hadith: [{ ref: "Sahih al-Bukhari 7405", text: "Allah's Hand is full; spending does not diminish it. He gives by night and by day." }]
  },
  { num: 21, ar: "ٱلْبَاسِطُ", en: "The Extender", tr: "Al-Basit",
    desc: "The One who expands and stretches out sustenance and provisions to whomever He wills.",
    quran: [{ ref: "Ar-Ra'd 13:26", text: "Allah extends provision for whom He wills and restricts [it]. And they rejoice in the worldly life." }],
    hadith: [{ ref: "Sunan at-Tirmidhi 2344", text: "If you were to rely upon Allah with the reliance He is due, He would provide for you just as He provides for the birds." }]
  },
  { num: 22, ar: "ٱلْخَافِضُ", en: "The Reducer", tr: "Al-Khafid",
    desc: "The One who lowers whoever He wills by His destruction, and raises whoever He wills by His endowment.",
    quran: [{ ref: "Al-Waqi'ah 56:3", text: "It will bring down [some] and raise up [others]." }],
    hadith: [{ ref: "Sunan at-Tirmidhi 3524", text: "The Prophet (ﷺ) mentioned the names of Allah and among them: Al-Khafid, Ar-Rafi'." }]
  },
  { num: 23, ar: "ٱلرَّافِعُ", en: "The Exalter", tr: "Ar-Rafi'",
    desc: "The One who raises His creatures above one another, elevating whom He wills in rank and status.",
    quran: [{ ref: "Al-An'am 6:83", text: "We raise in degrees whom We will. Indeed, your Lord is Wise and Knowing." }],
    hadith: [{ ref: "Sahih Muslim 2588", text: "No one humbles himself for the sake of Allah but Allah will raise his status." }]
  },
  { num: 24, ar: "ٱلْمُعِزُّ", en: "The Honorer", tr: "Al-Mu'izz",
    desc: "The One who gives honor and strength to whomever He wills. No one can bestow honor except Him.",
    quran: [{ ref: "Aal-e-Imran 3:26", text: "You give sovereignty to whom You will and You take sovereignty from whom You will. You honor whom You will and You humble whom You will." }],
    hadith: [{ ref: "Sunan at-Tirmidhi 3600", text: "Whoever humbles himself before Allah, Allah will raise him." }]
  },
  { num: 25, ar: "ٱلْمُذِلُّ", en: "The Humiliator", tr: "Al-Mudhill",
    desc: "The One who humbles and debases whoever He wills, removing honor from the disobedient.",
    quran: [{ ref: "Aal-e-Imran 3:26", text: "...You honor whom You will and You humble whom You will. In Your hand is [all] good." }],
    hadith: [{ ref: "Sahih al-Bukhari 4818", text: "The most hated person to Allah is the most quarrelsome person." }]
  },
  { num: 26, ar: "ٱلسَّمِيعُ", en: "The All-Hearing", tr: "As-Sami'",
    desc: "The One who hears all things, both secret and open, with perfect hearing that encompasses everything.",
    quran: [{ ref: "Al-Baqarah 2:127", text: "Our Lord, accept [this] from us. Indeed You are the Hearing, the Knowing." }],
    hadith: [{ ref: "Sahih al-Bukhari 6035", text: "Be mindful of Allah and He will protect you. Be mindful of Allah and you will find Him before you." }]
  },
  { num: 27, ar: "ٱلْبَصِيرُ", en: "The All-Seeing", tr: "Al-Basir",
    desc: "The One who sees all things, from the smallest atom to the greatest creation, nothing is hidden from Him.",
    quran: [{ ref: "Al-Isra 17:1", text: "Indeed, He is the Hearing, the Seeing." }],
    hadith: [{ ref: "Sahih Muslim 8", text: "Ihsan is to worship Allah as though you see Him, and though you do not see Him, He truly sees you." }]
  },
  { num: 28, ar: "ٱلْحَكَمُ", en: "The Judge", tr: "Al-Hakam",
    desc: "The One who judges between His creation with truth and justice. His judgment cannot be reversed.",
    quran: [{ ref: "Al-An'am 6:114", text: "Shall I seek a judge other than Allah while it is He who has revealed to you the Book explained in detail?" }],
    hadith: [{ ref: "Sunan Abu Dawud 4955", text: "Indeed, Allah is the Judge and to Him belongs the judgment." }]
  },
  { num: 29, ar: "ٱلْعَدْلُ", en: "The Just", tr: "Al-'Adl",
    desc: "The One who is entitled to do what He does. He places everything in its rightful place with perfect justice.",
    quran: [{ ref: "An-Nahl 16:90", text: "Indeed, Allah orders justice and good conduct and giving to relatives." }],
    hadith: [{ ref: "Sahih Muslim 2577", text: "O My servants, I have forbidden oppression for Myself and have made it forbidden among you, so do not oppress one another." }]
  },
  { num: 30, ar: "ٱللَّطِيفُ", en: "The Subtle One", tr: "Al-Latif",
    desc: "The One who is kind to His servants in ways they cannot perceive, guiding them through hidden gentleness.",
    quran: [{ ref: "Ash-Shura 42:19", text: "Allah is Subtle with His servants; He gives provisions to whom He wills." }],
    hadith: [{ ref: "Sahih al-Bukhari 6502", text: "Allah said: Whoever shows enmity to a friend of Mine, I declare war against him." }]
  },
  { num: 31, ar: "ٱلْخَبِيرُ", en: "The All-Aware", tr: "Al-Khabir",
    desc: "The One who is aware of the inner states of all things, knowing every hidden secret and intention.",
    quran: [{ ref: "Al-Mulk 67:14", text: "Does He who created not know, while He is the Subtle, the Acquainted?" }],
    hadith: [{ ref: "Sunan at-Tirmidhi 2516", text: "Be mindful of Allah, and you will find Him in front of you." }]
  },
  { num: 32, ar: "ٱلْحَلِيمُ", en: "The Forbearing", tr: "Al-Halim",
    desc: "The One who delays punishment, giving time for repentance. He forgives even when He has the power to punish.",
    quran: [{ ref: "Al-Baqarah 2:225", text: "And Allah is Forgiving and Forbearing (Halim)." }],
    hadith: [{ ref: "Sahih al-Bukhari 6099", text: "The Prophet (ﷺ) said to Ashaj Abd al-Qays: 'You have two qualities that Allah loves: forbearance and steadiness.'" }]
  },
  { num: 33, ar: "ٱلْعَظِيمُ", en: "The Magnificent", tr: "Al-'Azim",
    desc: "The One deserving the attributes of exaltment, glory, and greatness above all else.",
    quran: [{ ref: "Al-Baqarah 2:255", text: "And He is the Most High, the Most Great (Al-'Azim)." }],
    hadith: [{ ref: "Sahih al-Bukhari 4722", text: "When the reciter says 'So glorify the Name of your Lord, the Most Great,' say: 'Subhana Rabbiyal Azim.'" }]
  },
  { num: 34, ar: "ٱلْغَفُورُ", en: "The All-Forgiving", tr: "Al-Ghafur",
    desc: "The One who forgives extensively, pardoning sins and concealing faults repeatedly without limit.",
    quran: [{ ref: "Az-Zumar 39:53", text: "Say: O My servants who have transgressed against themselves, do not despair of the mercy of Allah. Indeed, Allah forgives all sins." }],
    hadith: [{ ref: "Sahih al-Bukhari 7554", text: "A man sinned and said: O Lord, forgive my sin. Allah said: My slave committed a sin and knew that he has a Lord who forgives sins." }]
  },
  { num: 35, ar: "ٱلشَّكُورُ", en: "The Grateful", tr: "Ash-Shakur",
    desc: "The One who rewards abundantly even for small deeds, and multiplies the rewards of the sincere.",
    quran: [{ ref: "Fatir 35:30", text: "That He may pay them their rewards in full and increase them from His bounty. Indeed, He is Forgiving and Appreciative." }],
    hadith: [{ ref: "Sahih Muslim 2675", text: "Allah is more pleased with the repentance of a servant than one of you who finds his lost article in a barren land." }]
  },
  { num: 36, ar: "ٱلْعَلِيُّ", en: "The Most High", tr: "Al-'Ali",
    desc: "The One who is above and exceeds all others. His highness is of status, dominion, and power.",
    quran: [{ ref: "Al-Baqarah 2:255", text: "And He is the Most High (Al-'Ali), the Most Great." }],
    hadith: [{ ref: "Sahih Muslim 179", text: "His Veil is Light. If He were to remove it, the glory of His face would burn everything of His creation." }]
  },
  { num: 37, ar: "ٱلْكَبِيرُ", en: "The Great", tr: "Al-Kabir",
    desc: "The One who is incomparably great in His essence and attributes, greater than everything.",
    quran: [{ ref: "Ar-Ra'd 13:9", text: "The Knower of the unseen and the witnessed, the Grand (Al-Kabir), the Exalted." }],
    hadith: [{ ref: "Sunan at-Tirmidhi 3481", text: "Two words light on the tongue, heavy on the scale: Subhan Allahi wa bihamdihi, Subhan Allahil Azim." }]
  },
  { num: 38, ar: "ٱلْحَفِيظُ", en: "The Preserver", tr: "Al-Hafiz",
    desc: "The One who protects and preserves all creation. Nothing is lost or forgotten by Him.",
    quran: [{ ref: "Hud 11:57", text: "Indeed, my Lord is over all things a Guardian (Hafiz)." }],
    hadith: [{ ref: "Sunan at-Tirmidhi 2516", text: "Guard Allah (be mindful of Him) and He will guard you." }]
  },
  { num: 39, ar: "ٱلْمُقِيتُ", en: "The Sustainer", tr: "Al-Muqit",
    desc: "The Nourisher who sustains all living things, creating and maintaining all forms of sustenance.",
    quran: [{ ref: "An-Nisa 4:85", text: "And ever is Allah, over all things, a Keeper (Muqit)." }],
    hadith: [{ ref: "Sahih al-Bukhari 5373", text: "The food of one is sufficient for two, and the food of two is sufficient for four." }]
  },
  { num: 40, ar: "ٱلْحَسِيبُ", en: "The Reckoner", tr: "Al-Hasib",
    desc: "The One who takes account of all deeds and is sufficient for His servants in all their needs.",
    quran: [{ ref: "An-Nisa 4:6", text: "And sufficient is Allah as Accountant (Hasib)." }],
    hadith: [{ ref: "Sahih al-Bukhari 6536", text: "Everyone will be called to account until even the bruise given by a horn of one animal to another will be settled." }]
  },
  { num: 41, ar: "ٱلْجَلِيلُ", en: "The Majestic", tr: "Al-Jalil",
    desc: "The One with majesty and sublimity. He is exalted in every way with perfect attributes.",
    quran: [{ ref: "Ar-Rahman 55:27", text: "And there will remain the Face of your Lord, Owner of Majesty and Honor." }],
    hadith: [{ ref: "Sahih Muslim 2720", text: "O Allah, I ask You by Your Glory which does not cease and Your dominion which lasts forever." }]
  },
  { num: 42, ar: "ٱلْكَرِيمُ", en: "The Generous", tr: "Al-Karim",
    desc: "The Bountiful, the One whose generosity extends to all creation without any need for reciprocation.",
    quran: [{ ref: "Al-Infitar 82:6", text: "O mankind, what has deceived you concerning your Lord, the Generous (Al-Karim)?" }],
    hadith: [{ ref: "Sunan at-Tirmidhi 3573", text: "Indeed, Allah is Generous and He loves generosity." }]
  },
  { num: 43, ar: "ٱلرَّقِيبُ", en: "The Watchful", tr: "Ar-Raqib",
    desc: "The One who watches over all creation at all times, aware of every thought, action, and intention.",
    quran: [{ ref: "An-Nisa 4:1", text: "Indeed Allah is ever, over you, an Observer (Raqib)." }],
    hadith: [{ ref: "Sahih Muslim 8", text: "Ihsan is to worship Allah as if you see Him, for though you do not see Him, He sees you." }]
  },
  { num: 44, ar: "ٱلْمُجِيبُ", en: "The Responsive", tr: "Al-Mujib",
    desc: "The One who responds to every supplication and prayer, answering each caller when they call upon Him.",
    quran: [{ ref: "Hud 11:61", text: "Indeed, my Lord is near and responsive (Mujib)." }],
    hadith: [{ ref: "Sahih al-Bukhari 6340", text: "The invocation of any one of you is granted as long as he does not show impatience." }]
  },
  { num: 45, ar: "ٱلْوَاسِعُ", en: "The All-Encompassing", tr: "Al-Wasi'",
    desc: "The One whose mercy, knowledge, and power encompass all things without any limit.",
    quran: [{ ref: "Al-Baqarah 2:115", text: "Indeed, Allah is All-Encompassing (Wasi') and Knowing." }],
    hadith: [{ ref: "Sahih al-Bukhari 7404", text: "Allah divided mercy into one hundred parts and kept ninety-nine with Him and sent one to earth." }]
  },
  { num: 46, ar: "ٱلْحَكِيمُ", en: "The All-Wise", tr: "Al-Hakim",
    desc: "The One who is perfectly wise in all His actions and decrees. Everything He ordains has a profound purpose.",
    quran: [{ ref: "Al-Baqarah 2:32", text: "They said: Exalted are You; we have no knowledge except what You have taught us. Indeed, it is You who is the Knowing, the Wise." }],
    hadith: [{ ref: "Sahih Muslim 2720", text: "O Allah, I ask You by every Name belonging to You with which You have named Yourself." }]
  },
  { num: 47, ar: "ٱلْوَدُودُ", en: "The Most Loving", tr: "Al-Wadud",
    desc: "The One who loves His righteous servants and is beloved by them. His love is the most pure and complete.",
    quran: [{ ref: "Hud 11:90", text: "And ask forgiveness of your Lord and then repent to Him. Indeed, my Lord is Merciful and Loving (Wadud)." }],
    hadith: [{ ref: "Sahih Muslim 2637", text: "When Allah loves a servant, He calls Jibril and says: I love so-and-so, so love him." }]
  },
  { num: 48, ar: "ٱلْمَجِيدُ", en: "The Most Glorious", tr: "Al-Majid",
    desc: "The One who is most Glorious, whose dignity and greatness are beyond comprehension.",
    quran: [{ ref: "Hud 11:73", text: "The mercy of Allah and His blessings be upon you, people of the house. Indeed, He is Praiseworthy and Honorable (Majid)." }],
    hadith: [{ ref: "Sahih al-Bukhari 3370", text: "O Allah, send prayers upon Muhammad and upon the family of Muhammad, as You sent prayers upon Ibrahim. You are Praiseworthy, Most Glorious." }]
  },
  { num: 49, ar: "ٱلْبَاعِثُ", en: "The Resurrector", tr: "Al-Ba'ith",
    desc: "The One who resurrects the dead on the Day of Judgment, raising all creation for the final reckoning.",
    quran: [{ ref: "Al-Hajj 22:7", text: "And that the Hour is coming — no doubt about it — and that Allah will resurrect those in the graves." }],
    hadith: [{ ref: "Sahih al-Bukhari 1338", text: "The people will be resurrected barefooted, naked, and uncircumcised." }]
  },
  { num: 50, ar: "ٱلشَّهِيدُ", en: "The Witness", tr: "Ash-Shahid",
    desc: "The One who witnesses all things openly and secretly, from whom nothing whatsoever is absent.",
    quran: [{ ref: "Al-Maidah 5:117", text: "And You are, over all things, Witness (Shahid)." }],
    hadith: [{ ref: "Sahih Muslim 2577", text: "O My servants, it is but your deeds that I record for you and then recompense you for." }]
  },
  { num: 51, ar: "ٱلْحَقُّ", en: "The Truth", tr: "Al-Haqq",
    desc: "The One who truly exists, whose existence is undeniable. He is the absolute reality and truth.",
    quran: [{ ref: "Ta-Ha 20:114", text: "So high above all is Allah, the Sovereign, the Truth (Al-Haqq). And do not hasten with the Quran before its revelation is completed to you." }],
    hadith: [{ ref: "Sahih al-Bukhari 1120", text: "O Allah, all praises are for You. You are the Truth, and Your Promise is the truth." }]
  },
  { num: 52, ar: "ٱلْوَكِيلُ", en: "The Trustee", tr: "Al-Wakil",
    desc: "The One who is the disposer of all affairs, the ultimate trustee upon whom one can rely completely.",
    quran: [{ ref: "Aal-e-Imran 3:173", text: "Sufficient for us is Allah, and He is the best Disposer of affairs (Wakil)." }],
    hadith: [{ ref: "Sahih al-Bukhari 4563", text: "Sufficient for us is Allah and He is the best Disposer of affairs — Ibrahim said it when thrown into the fire." }]
  },
  { num: 53, ar: "ٱلْقَوِيُّ", en: "The Most Strong", tr: "Al-Qawi",
    desc: "The One with the most perfect power. His strength is unlimited and nothing can overpower Him.",
    quran: [{ ref: "Ash-Shura 42:19", text: "Indeed, Allah is Subtle with His servants; He provides for whom He wills. And He is the Powerful (Qawi), the Exalted in Might." }],
    hadith: [{ ref: "Sahih Muslim 2664", text: "The strong believer is better and more beloved to Allah than the weak believer, while there is good in both." }]
  },
  { num: 54, ar: "ٱلْمَتِينُ", en: "The Firm", tr: "Al-Matin",
    desc: "The One with extreme power which is uninterrupted, whose strength never weakens or decreases.",
    quran: [{ ref: "Adh-Dhariyat 51:58", text: "Indeed, it is Allah who is the Provider, the firm possessor of strength (Al-Matin)." }],
    hadith: [{ ref: "Sahih al-Bukhari 7405", text: "Allah's Hand is full, spending does not diminish it. He gives generously by night and by day." }]
  },
  { num: 55, ar: "ٱلْوَلِيُّ", en: "The Protecting Friend", tr: "Al-Wali",
    desc: "The One who is the supporter, helper, and loving friend of the believers, guiding them to success.",
    quran: [{ ref: "Al-Baqarah 2:257", text: "Allah is the ally (Wali) of those who believe. He brings them out from darkness into the light." }],
    hadith: [{ ref: "Sahih al-Bukhari 6502", text: "Whoever shows enmity to a Wali (friend) of Mine, I shall be at war with him." }]
  },
  { num: 56, ar: "ٱلْحَمِيدُ", en: "The Praiseworthy", tr: "Al-Hamid",
    desc: "The One who is praiseworthy in all His actions, attributes, and statements. All praise truly belongs to Him.",
    quran: [{ ref: "Ibrahim 14:1", text: "A Book which We have revealed to you that you might bring people from darkness into light by permission of their Lord — to the path of the Exalted in Might, the Praiseworthy (Hamid)." }],
    hadith: [{ ref: "Sahih al-Bukhari 799", text: "Allah hears those who praise Him. O our Lord, all praise is for You." }]
  },
  { num: 57, ar: "ٱلْمُحْصِي", en: "The Accounter", tr: "Al-Muhsi",
    desc: "The One who has counted and knows the quantity of everything in existence, nothing escapes His count.",
    quran: [{ ref: "Maryam 19:94", text: "He has enumerated them and counted them a [full] counting." }],
    hadith: [{ ref: "Sahih al-Bukhari 6410", text: "Allah has ninety-nine names. Whoever enumerates (learns and acts upon) them will enter Paradise." }]
  },
  { num: 58, ar: "ٱلْمُبْدِئُ", en: "The Originator", tr: "Al-Mubdi'",
    desc: "The One who started the creation, bringing all things into existence from absolute nothingness.",
    quran: [{ ref: "Al-Buruj 85:13", text: "Indeed, it is He who originates [creation] and repeats." }],
    hadith: [{ ref: "Sahih Muslim 2713", text: "O Allah, by Your knowledge of the unseen and Your power over creation..." }]
  },
  { num: 59, ar: "ٱلْمُعِيدُ", en: "The Restorer", tr: "Al-Mu'id",
    desc: "The One who brings back creation after death, restoring them to life for the Day of Judgment.",
    quran: [{ ref: "Al-Buruj 85:13", text: "Indeed, it is He who originates [creation] and repeats (restores)." }],
    hadith: [{ ref: "Sahih al-Bukhari 1338", text: "All people will be gathered barefooted, naked and uncircumcised on the Day of Resurrection." }]
  },
  { num: 60, ar: "ٱلْمُحْيِي", en: "The Giver of Life", tr: "Al-Muhyi",
    desc: "The One who gives life to all living things and who brings the dead earth back to life with rain.",
    quran: [{ ref: "Ar-Rum 30:50", text: "So observe the effects of the mercy of Allah — how He gives life to the earth after its lifelessness." }],
    hadith: [{ ref: "Sahih Muslim 2687", text: "Allah is more pleased with the repentance of a servant than one of you would be if they found their lost camel." }]
  },
  { num: 61, ar: "ٱلْمُمِيتُ", en: "The Taker of Life", tr: "Al-Mumit",
    desc: "The One who creates death. Every soul shall taste death, and it is He who ordains the time for each.",
    quran: [{ ref: "Al-Mulk 67:2", text: "[He] who created death and life to test you [as to] which of you is best in deed." }],
    hadith: [{ ref: "Sunan at-Tirmidhi 2307", text: "Remember often the destroyer of pleasures — meaning death." }]
  },
  { num: 62, ar: "ٱلْحَيُّ", en: "The Ever Living", tr: "Al-Hayy",
    desc: "The One who has a perfect and eternal life, with no beginning and no end. He never dies.",
    quran: [{ ref: "Al-Baqarah 2:255", text: "Allah — there is no deity except Him, the Ever-Living (Al-Hayy), the Sustainer of existence." }],
    hadith: [{ ref: "Sunan at-Tirmidhi 3524", text: "O Ever-Living, O Sustainer of all existence, by Your mercy I seek assistance." }]
  },
  { num: 63, ar: "ٱلْقَيُّومُ", en: "The Self-Subsisting", tr: "Al-Qayyum",
    desc: "The One who sustains all existence. He needs nothing while everything needs Him to exist.",
    quran: [{ ref: "Al-Baqarah 2:255", text: "Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence (Al-Qayyum). Neither drowsiness overtakes Him nor sleep." }],
    hadith: [{ ref: "Sunan Abu Dawud 1495", text: "The greatest name of Allah, when called upon He answers, is in Al-Baqarah and Aal-e-Imran: Al-Hayy Al-Qayyum." }]
  },
  { num: 64, ar: "ٱلْوَاجِدُ", en: "The Finder", tr: "Al-Wajid",
    desc: "The One who finds whatever He wills. Nothing is lost to Him and He has no need of anything.",
    quran: [{ ref: "Ad-Duha 93:7", text: "And He found you lost and guided [you]." }],
    hadith: [{ ref: "Sahih al-Bukhari 7405", text: "Allah's Hand is full; spending does not diminish it, bountiful by night and day." }]
  },
  { num: 65, ar: "ٱلْمَاجِدُ", en: "The Glorious", tr: "Al-Majid",
    desc: "The One who is Most Glorious and Noble. His generosity and honor have no bounds.",
    quran: [{ ref: "Al-Buruj 85:15", text: "Owner of the Throne, the Glorious (Al-Majid)." }],
    hadith: [{ ref: "Sahih al-Bukhari 3370", text: "You are Praiseworthy, Most Glorious (Majid)." }]
  },
  { num: 66, ar: "ٱلْوَاحِدُ", en: "The One", tr: "Al-Wahid",
    desc: "The One without any partner or equal. He is uniquely One in His essence, attributes, and actions.",
    quran: [{ ref: "Al-Baqarah 2:163", text: "And your god is one God (Wahid). There is no deity except Him, the Most Merciful." }],
    hadith: [{ ref: "Sahih al-Bukhari 7404", text: "Allah was alone and there was nothing before Him." }]
  },
  { num: 67, ar: "ٱلْأَحَدُ", en: "The Unique", tr: "Al-Ahad",
    desc: "The Unique One, absolutely singular. He is indivisible and incomparable in every way.",
    quran: [{ ref: "Al-Ikhlas 112:1", text: "Say: He is Allah, the One (Ahad)." }],
    hadith: [{ ref: "Sahih al-Bukhari 5015", text: "Whoever recites Qul Huwa Allahu Ahad (Surah Al-Ikhlas) ten times, Allah will build for him a house in Paradise." }]
  },
  { num: 68, ar: "ٱلصَّمَدُ", en: "The Eternal", tr: "As-Samad",
    desc: "The Eternal, the Absolute. The One whom all creation turns to in their needs, yet He needs no one.",
    quran: [{ ref: "Al-Ikhlas 112:2", text: "Allah, the Eternal Refuge (As-Samad)." }],
    hadith: [{ ref: "Sunan at-Tirmidhi 3364", text: "Surah Al-Ikhlas (Say: He is Allah, the One) is equal to a third of the Quran." }]
  },
  { num: 69, ar: "ٱلْقَادِرُ", en: "The Able", tr: "Al-Qadir",
    desc: "The One who has the ability to do anything, the One for whom nothing is impossible.",
    quran: [{ ref: "Al-Baqarah 2:20", text: "Indeed, Allah is over all things competent (Qadir)." }],
    hadith: [{ ref: "Sahih Muslim 2713", text: "O Allah, by Your knowledge of the unseen and Your power (Qudrah) over creation." }]
  },
  { num: 70, ar: "ٱلْمُقْتَدِرُ", en: "The Powerful", tr: "Al-Muqtadir",
    desc: "The One with the perfect power from which nothing is withheld. He enforces His absolute will.",
    quran: [{ ref: "Al-Qamar 54:55", text: "In a seat of honor near a Sovereign, Perfect in Ability (Muqtadir)." }],
    hadith: [{ ref: "Sahih al-Bukhari 7405", text: "Allah's Hand is full, spending does not diminish it." }]
  },
  { num: 71, ar: "ٱلْمُقَدِّمُ", en: "The Expediter", tr: "Al-Muqaddim",
    desc: "The One who brings forward whomever He wills, advancing them in rank, time, or station.",
    quran: [{ ref: "Al-Hijr 15:24", text: "And We have already known the preceding [generations] among you, and We have already known the later [ones to come]." }],
    hadith: [{ ref: "Sahih al-Bukhari 1120", text: "O Allah, forgive me my former and latter sins, what I have kept secret and what I have done openly." }]
  },
  { num: 72, ar: "ٱلْمُؤَخِّرُ", en: "The Delayer", tr: "Al-Mu'akhkhir",
    desc: "The One who delays and puts behind whomever He wills by His wisdom and justice.",
    quran: [{ ref: "Ibrahim 14:42", text: "He only delays them for a Day when eyes will stare in horror." }],
    hadith: [{ ref: "Sahih al-Bukhari 6398", text: "O Allah, forgive me what I have sent before me and what I have left behind." }]
  },
  { num: 73, ar: "ٱلْأَوَّلُ", en: "The First", tr: "Al-Awwal",
    desc: "The One whose existence has no beginning. He existed before all of creation.",
    quran: [{ ref: "Al-Hadid 57:3", text: "He is the First (Al-Awwal) and the Last, the Ascendant and the Intimate, and He is, of all things, Knowing." }],
    hadith: [{ ref: "Sahih Muslim 2713", text: "O Allah, You are the First: there is nothing before You." }]
  },
  { num: 74, ar: "ٱلْآخِرُ", en: "The Last", tr: "Al-Akhir",
    desc: "The One whose existence has no end. He remains after all of creation perishes.",
    quran: [{ ref: "Al-Hadid 57:3", text: "He is the First and the Last (Al-Akhir), the Ascendant and the Intimate." }],
    hadith: [{ ref: "Sahih Muslim 2713", text: "And You are the Last: there is nothing after You." }]
  },
  { num: 75, ar: "ٱلظَّاهِرُ", en: "The Manifest", tr: "Az-Zahir",
    desc: "The One whose existence is evident through His signs. He is above everything, the Most High.",
    quran: [{ ref: "Al-Hadid 57:3", text: "He is the First and the Last, the Ascendant (Az-Zahir) and the Intimate." }],
    hadith: [{ ref: "Sahih Muslim 2713", text: "You are Az-Zahir, there is nothing above You." }]
  },
  { num: 76, ar: "ٱلْبَاطِنُ", en: "The Hidden", tr: "Al-Batin",
    desc: "The One hidden from our senses, whose true essence cannot be perceived. He knows all inner secrets.",
    quran: [{ ref: "Al-Hadid 57:3", text: "He is the First and the Last, the Ascendant and the Intimate (Al-Batin)." }],
    hadith: [{ ref: "Sahih Muslim 2713", text: "And You are Al-Batin, there is nothing closer than You." }]
  },
  { num: 77, ar: "ٱلْوَالِي", en: "The Governor", tr: "Al-Wali",
    desc: "The One who owns all things and manages their affairs. He is the master of all dominion.",
    quran: [{ ref: "Ar-Ra'd 13:11", text: "Indeed, Allah will not change the condition of a people until they change what is within themselves." }],
    hadith: [{ ref: "Sahih al-Bukhari 7405", text: "Allah's Hand is full, spending does not diminish it." }]
  },
  { num: 78, ar: "ٱلْمُتَعَالِي", en: "The Most Exalted", tr: "Al-Muta'ali",
    desc: "The Supreme One, exalted beyond any limit that the mind can conceive or imagination can reach.",
    quran: [{ ref: "Ar-Ra'd 13:9", text: "The Knower of the unseen and the witnessed, the Grand, the Exalted (Al-Muta'ali)." }],
    hadith: [{ ref: "Sahih Muslim 179", text: "His Veil is Light. If He were to remove it, the glory of His Face would burn everything." }]
  },
  { num: 79, ar: "ٱلْبَرُّ", en: "The Source of Goodness", tr: "Al-Barr",
    desc: "The One whose kindness and goodness are vast. He treats His creation with tolerance, generosity, and kindness.",
    quran: [{ ref: "At-Tur 52:28", text: "Indeed, we used to supplicate Him before. Indeed, it is He who is the Beneficent (Al-Barr), the Merciful." }],
    hadith: [{ ref: "Sunan at-Tirmidhi 1924", text: "Be dutiful to your parents and your children will be dutiful to you." }]
  },
  { num: 80, ar: "ٱلتَّوَّابُ", en: "The Acceptor of Repentance", tr: "At-Tawwab",
    desc: "The One who constantly turns towards His servants in forgiveness and accepts their repentance over and over.",
    quran: [{ ref: "Al-Baqarah 2:37", text: "Then Adam received from his Lord [some] words, and He accepted his repentance. Indeed, it is He who is the Accepting of Repentance (At-Tawwab), the Merciful." }],
    hadith: [{ ref: "Sunan at-Tirmidhi 3537", text: "Allah extends His Hand at night to accept the repentance of the one who sinned during the day." }]
  },
  { num: 81, ar: "ٱلْمُنْتَقِمُ", en: "The Avenger", tr: "Al-Muntaqim",
    desc: "The One who justly punishes the wrongdoers and oppressors, taking retribution against those who persist in evil.",
    quran: [{ ref: "As-Sajdah 32:22", text: "Indeed We, from the criminals, will take retribution (Muntaqimun)." }],
    hadith: [{ ref: "Sahih al-Bukhari 6927", text: "Allah gives respite to the wrongdoer, but when He seizes him, He does not let him escape." }]
  },
  { num: 82, ar: "ٱلْعَفُوُّ", en: "The Pardoner", tr: "Al-'Afuw",
    desc: "The One who pardons and erases sins completely, as if they never existed. He loves to pardon.",
    quran: [{ ref: "An-Nisa 4:149", text: "Indeed, Allah is ever Pardoning ('Afuw) and Competent." }],
    hadith: [{ ref: "Sunan at-Tirmidhi 3513", text: "Aisha asked the Prophet (ﷺ) what to say on Laylat al-Qadr. He said: 'Allahumma innaka 'Afuwwun tuhibbul 'afwa fa'fu 'anni' (O Allah, You are the Pardoner who loves pardoning, so pardon me)." }]
  },
  { num: 83, ar: "ٱلرَّؤُوفُ", en: "The Most Kind", tr: "Ar-Ra'uf",
    desc: "The One who is full of compassion, whose mercy and kindness are far greater than anyone can imagine.",
    quran: [{ ref: "Al-Baqarah 2:207", text: "And Allah is Kind (Ra'uf) to [His] servants." }],
    hadith: [{ ref: "Sahih al-Bukhari 6000", text: "He who does not show mercy to others, will not be shown mercy." }]
  },
  { num: 84, ar: "مَالِكُ ٱلْمُلْكِ", en: "Owner of Sovereignty", tr: "Malik-ul-Mulk",
    desc: "The One who owns all sovereignty and dominion. He gives and takes kingdom as He pleases.",
    quran: [{ ref: "Aal-e-Imran 3:26", text: "Say: O Allah, Owner of Sovereignty (Malik-ul-Mulk), You give sovereignty to whom You will and You take sovereignty away from whom You will." }],
    hadith: [{ ref: "Sahih Muslim 2788", text: "Allah will fold the heavens on the Day of Resurrection and say: I am the King." }]
  },
  { num: 85, ar: "ذُو ٱلْجَلَالِ وَٱلْإِكْرَامِ", en: "Lord of Majesty & Generosity", tr: "Dhul-Jalali wal-Ikram",
    desc: "The One who possesses both greatness and generosity, majesty and bounty in absolute perfection.",
    quran: [{ ref: "Ar-Rahman 55:27", text: "And there will remain the Face of your Lord, Owner of Majesty and Honor (Dhul-Jalali wal-Ikram)." }],
    hadith: [{ ref: "Sunan at-Tirmidhi 3525", text: "Persist in saying: Ya Dhal-Jalali wal-Ikram (O Possessor of majesty and honor)." }]
  },
  { num: 86, ar: "ٱلْمُقْسِطُ", en: "The Equitable", tr: "Al-Muqsit",
    desc: "The One who acts with justice and fairness. He establishes perfect equity in all matters.",
    quran: [{ ref: "Al-Anbiya 21:47", text: "And We place the scales of justice for the Day of Resurrection, so no soul will be treated unjustly at all." }],
    hadith: [{ ref: "Sahih Muslim 1827", text: "The just will be on pulpits of light on the Day of Resurrection." }]
  },
  { num: 87, ar: "ٱلْجَامِعُ", en: "The Gatherer", tr: "Al-Jami'",
    desc: "The One who gathers all creation together on the Day of Judgment, uniting all things as He wills.",
    quran: [{ ref: "Aal-e-Imran 3:9", text: "Our Lord, surely You will gather the people for a Day about which there is no doubt." }],
    hadith: [{ ref: "Sahih al-Bukhari 6527", text: "The people will be gathered on the Day of Resurrection on reddish white land." }]
  },
  { num: 88, ar: "ٱلْغَنِيُّ", en: "The Self-Sufficient", tr: "Al-Ghani",
    desc: "The One who is free from all needs. He is absolutely independent and needs nothing from His creation.",
    quran: [{ ref: "Muhammad 47:38", text: "And Allah is the Free of need (Al-Ghani), while you are those in need." }],
    hadith: [{ ref: "Sahih Muslim 2577", text: "O My servants, you will not attain harming Me so as to harm Me, and you will not attain benefiting Me so as to benefit Me." }]
  },
  { num: 89, ar: "ٱلْمُغْنِي", en: "The Enricher", tr: "Al-Mughni",
    desc: "The One who enriches whomever He wills, granting sufficiency and freedom from need.",
    quran: [{ ref: "At-Tawbah 9:28", text: "And if you fear poverty, Allah will enrich you from His bounty if He wills." }],
    hadith: [{ ref: "Sahih al-Bukhari 1472", text: "Richness is not having many possessions, but richness is the richness of the soul." }]
  },
  { num: 90, ar: "ٱلْمَانِعُ", en: "The Preventer of Harm", tr: "Al-Mani'",
    desc: "The One who prevents harm from reaching His servants and withholds things by His wisdom.",
    quran: [{ ref: "Aal-e-Imran 3:26", text: "In Your hand is [all] good. Indeed, You are over all things competent." }],
    hadith: [{ ref: "Sahih al-Bukhari 6615", text: "There is none who can withhold what You have given and none who can give what You have withheld." }]
  },
  { num: 91, ar: "ٱلضَّارُّ", en: "The Distresser", tr: "Ad-Darr",
    desc: "The One who tests with hardship those whom He wills, as a means of purification and growth.",
    quran: [{ ref: "Al-An'am 6:17", text: "And if Allah should touch you with adversity, there is no remover of it except Him." }],
    hadith: [{ ref: "Sunan at-Tirmidhi 2516", text: "Know that if the whole nation were to gather together to harm you, they could not harm you except with what Allah has already written against you." }]
  },
  { num: 92, ar: "ٱلنَّافِعُ", en: "The Propitious", tr: "An-Nafi'",
    desc: "The One who benefits and creates good for whomever He wills, granting that which is truly beneficial.",
    quran: [{ ref: "Al-Fath 48:11", text: "Say: Then who could prevent Allah at all if He intended for you harm or intended for you benefit?" }],
    hadith: [{ ref: "Sunan at-Tirmidhi 2516", text: "If the whole nation gathered to benefit you, they could not benefit you except with what Allah has written for you." }]
  },
  { num: 93, ar: "ٱلنُّورُ", en: "The Light", tr: "An-Nur",
    desc: "The One who is the Light of the heavens and the earth, illuminating hearts with faith and guidance.",
    quran: [{ ref: "An-Nur 24:35", text: "Allah is the Light (An-Nur) of the heavens and the earth." }],
    hadith: [{ ref: "Sahih Muslim 179", text: "His Veil is Light. If He were to remove it, the splendor of His Face would burn everything of His creation." }]
  },
  { num: 94, ar: "ٱلْهَادِي", en: "The Guide", tr: "Al-Hadi",
    desc: "The One who guides and shows the right path to those He wills. True guidance only comes from Him.",
    quran: [{ ref: "Al-Hajj 22:54", text: "And indeed, Allah is the Guide (Al-Hadi) of those who have believed to a straight path." }],
    hadith: [{ ref: "Sahih Muslim 2713", text: "O Allah, guide me among those You have guided." }]
  },
  { num: 95, ar: "ٱلْبَدِيعُ", en: "The Originator", tr: "Al-Badi'",
    desc: "The One who originated the creation of all things in the most wonderful way, without any prior model.",
    quran: [{ ref: "Al-Baqarah 2:117", text: "Originator (Badi') of the heavens and the earth. When He decrees a matter, He only says to it, 'Be,' and it is." }],
    hadith: [{ ref: "Sahih Muslim 2713", text: "O Allah, by Your knowledge of the unseen and Your power over creation..." }]
  },
  { num: 96, ar: "ٱلْبَاقِي", en: "The Everlasting", tr: "Al-Baqi",
    desc: "The One whose existence endures forever. All creation will perish, but He alone will remain.",
    quran: [{ ref: "Ar-Rahman 55:27", text: "And there will remain (Yabqa) the Face of your Lord, Owner of Majesty and Honor." }],
    hadith: [{ ref: "Sahih al-Bukhari 1120", text: "You are the Truth, Your Word is the truth, and meeting You is the truth." }]
  },
  { num: 97, ar: "ٱلْوَارِثُ", en: "The Inheritor", tr: "Al-Warith",
    desc: "The One who remains after all creation has perished. He inherits the earth and all that is upon it.",
    quran: [{ ref: "Al-Hijr 15:23", text: "And indeed, it is We who give life and cause death, and We are the Inheritor (Al-Warith)." }],
    hadith: [{ ref: "Sahih Muslim 2717", text: "O Allah, You are the First and the Last, the Manifest and the Hidden." }]
  },
  { num: 98, ar: "ٱلرَّشِيدُ", en: "The Guide to the Right Path", tr: "Ar-Rashid",
    desc: "The One who guides all matters to the right course, directing creation to what is best for them.",
    quran: [{ ref: "Hud 11:87", text: "Indeed, my Lord is over all things Knower and Director (to right paths)." }],
    hadith: [{ ref: "Sahih Muslim 1844", text: "Hold fast to my Sunnah and the Sunnah of the Rightly Guided (Rashidun) Caliphs after me." }]
  },
  { num: 99, ar: "ٱلصَّبُورُ", en: "The Patient", tr: "As-Sabur",
    desc: "The One who is infinitely patient. He does not hasten punishment for the disobedient, giving them time to repent.",
    quran: [{ ref: "Al-Baqarah 2:153", text: "Indeed, Allah is with the patient (As-Sabireen)." }],
    hadith: [{ ref: "Sahih al-Bukhari 6099", text: "No one is more patient (Sabur) in the face of harmful speech than Allah. People claim He has a son, yet He still provides for them and gives them health." }]
  }
];

export default NAMES_DETAILS;
