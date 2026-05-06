import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const STEPS = [
  { num: 1, title: "Ihram", desc: "Enter the state of Ihram from Miqat. Men wear two white unstitched cloths. Women wear normal modest clothing. Make intention for Hajj and recite Talbiyah: 'Labbayk Allahumma labbayk...'", duas: ["لَبَّيْكَ اللّٰهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ"] },
  { num: 2, title: "8th Dhul-Hijjah (Yawm at-Tarwiyah)", desc: "Go to Mina before Dhuhr. Pray Dhuhr, Asr, Maghrib, Isha, and Fajr at Mina (shortened but not combined). Spend the night in Mina.", tips: "Keep reciting Talbiyah, make dhikr, and prepare spiritually for Arafah." },
  { num: 3, title: "9th Dhul-Hijjah (Day of Arafah)", desc: "After Fajr, proceed to Arafah. This is the most important day of Hajj. Stand in the plain of Arafah making dua, dhikr, and seeking forgiveness. Pray Dhuhr and Asr combined and shortened.", duas: ["لَا إِلٰهَ إِلَّا اللّٰهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ"], tips: "The Prophet ﷺ said: 'The best dua is the dua of Arafah.' (Tirmidhi 3585)" },
  { num: 4, title: "Night at Muzdalifah", desc: "After sunset on Arafah, proceed to Muzdalifah. Pray Maghrib and Isha combined. Sleep under the open sky. Collect 49-70 pebbles for Jamarat. Pray Fajr early.", tips: "Make dua between Fajr and sunrise. This is a blessed time." },
  { num: 5, title: "10th Dhul-Hijjah (Yawm an-Nahr)", desc: "1) Stone Jamarat al-Aqabah (big pillar) with 7 pebbles. 2) Offer animal sacrifice (Hady). 3) Shave head (men) or trim hair (women). 4) Perform Tawaf al-Ifadah. 5) Perform Sa'i between Safa and Marwah.", duas: ["بِسْمِ اللّٰهِ، اللّٰهُ أَكْبَرُ"] },
  { num: 6, title: "11th-13th Dhul-Hijjah (Days of Tashreeq)", desc: "Stay in Mina. Stone all three Jamarat each day (7 pebbles each, starting from smallest). You may leave on 12th after stoning if you wish (before sunset). Recite Takbeer after every prayer.", duas: ["اللّٰهُ أَكْبَرُ، اللّٰهُ أَكْبَرُ، لَا إِلٰهَ إِلَّا اللّٰهُ، وَاللّٰهُ أَكْبَرُ، اللّٰهُ أَكْبَرُ، وَلِلّٰهِ الْحَمْدُ"] },
  { num: 7, title: "Tawaf al-Wada (Farewell Tawaf)", desc: "Before leaving Makkah, perform the Farewell Tawaf (7 circuits around the Ka'bah). This is the final act of Hajj. Make dua facing the Ka'bah before departing.", tips: "The Prophet ﷺ said: 'None of you should leave until the last thing they do is Tawaf of the House.' (Muslim)" },
];

export default function HajjGuide() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/more" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pilgrimage</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Hajj Guide</h1>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-orange-200 bg-orange-50 p-5 text-sm text-orange-800 dark:border-orange-900 dark:bg-orange-950/30 dark:text-orange-300">
        🕋 This is a simplified step-by-step guide to Hajj (Tamattu' method). Consult your group scholar for detailed guidance specific to your situation.
      </div>

      <div className="space-y-4">
        {STEPS.map((step) => (
          <div key={step.num} className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-500 text-sm font-bold text-white shadow">
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
