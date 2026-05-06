import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const STEPS = [
  { num: 1, title: "Ihram", desc: "Enter the state of Ihram from the designated Miqat. Make the intention for Umrah. Men wear two white unstitched cloths (Izar and Rida). Women wear their normal modest clothing. Begin reciting the Talbiyah.", duas: ["لَبَّيْكَ اللّٰهُمَّ عُمْرَةً", "لَبَّيْكَ اللّٰهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ"], tips: "Prohibitions of Ihram: no perfume, no cutting hair/nails, no covering head (men), no sexual relations, no hunting." },
  { num: 2, title: "Tawaf (7 Circuits)", desc: "Perform 7 circuits around the Ka'bah starting from the Black Stone (Hajar al-Aswad). Walk counter-clockwise. Men should do Raml (brisk walking) in the first 3 circuits and Idtiba (expose right shoulder) throughout Tawaf.", duas: ["بِسْمِ اللّٰهِ وَاللّٰهُ أَكْبَرُ", "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ"], tips: "Say the dua between Yemeni Corner and Black Stone: 'Rabbana atina fid-dunya hasanah...' (Quran 2:201)" },
  { num: 3, title: "Two Rak'ah behind Maqam Ibrahim", desc: "After completing Tawaf, pray 2 Rak'ah behind Maqam Ibrahim (Station of Abraham). If it's crowded, you may pray anywhere in the Haram. Recite Surah Al-Kafirun in the first rak'ah and Surah Al-Ikhlas in the second.", duas: ["وَاتَّخِذُوا مِنْ مَقَامِ إِبْرَاهِيمَ مُصَلًّى"] },
  { num: 4, title: "Drink Zamzam Water", desc: "Drink from Zamzam water. Face the Ka'bah, say Bismillah, and drink. Make dua while drinking, as the Prophet ﷺ said: 'Zamzam water is for whatever purpose it is drunk for.' (Ibn Majah)", tips: "Make sincere dua while drinking — this is a time of acceptance." },
  { num: 5, title: "Sa'i (Safa & Marwah)", desc: "Walk between the hills of Safa and Marwah 7 times (Safa to Marwah = 1, Marwah to Safa = 2, etc.). Start at Safa and end at Marwah. Upon reaching Safa, face the Ka'bah, raise hands, and make dua.", duas: ["إِنَّ الصَّفَا وَالْمَرْوَةَ مِنْ شَعَائِرِ اللّٰهِ", "لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ، أَنْجَزَ وَعْدَهُ، وَنَصَرَ عَبْدَهُ، وَهَزَمَ الْأَحْزَابَ وَحْدَهُ"], tips: "Men should jog between the green lights (Batn al-Wadi). Women walk normally." },
  { num: 6, title: "Halq or Taqsir", desc: "After completing Sa'i, shave the head (Halq — preferred for men) or trim hair evenly (Taqsir — minimum for women, just a fingertip length). With this, your Umrah is complete and all Ihram restrictions are lifted.", tips: "The Prophet ﷺ made dua three times for those who shave their heads and once for those who trim. (Bukhari & Muslim)" },
];

export default function UmrahGuide() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/more" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Minor Pilgrimage</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Umrah Guide</h1>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-teal-200 bg-teal-50 p-5 text-sm text-teal-800 dark:border-teal-900 dark:bg-teal-950/30 dark:text-teal-300">
        🕌 The Prophet ﷺ said: "Umrah to Umrah is an expiation for whatever comes between them." (Bukhari & Muslim)
      </div>

      <div className="space-y-4">
        {STEPS.map((step) => (
          <div key={step.num} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-500 text-sm font-bold text-white shadow">
                {step.num}
              </div>
              <div className="flex-1">
                <h3 className="font-heading text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                {step.duas && (
                  <div className="mt-4 space-y-2">
                    {step.duas.map((d, i) => (
                      <p key={i} dir="rtl" className="rounded-xl bg-accent/50 px-4 py-3 text-right font-arabic text-lg leading-[2]">{d}</p>
                    ))}
                  </div>
                )}
                {step.tips && (
                  <p className="mt-3 rounded-xl bg-primary/5 px-4 py-2.5 text-xs text-primary font-medium">💡 {step.tips}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
