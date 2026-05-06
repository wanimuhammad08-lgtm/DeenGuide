import { useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

const FAQS = [
  { q: "What's the command on observing Salah during periods?", a: "A woman is exempt from Salah (prayer) during menstruation. She should not pray during this time, and she is not required to make up the missed prayers. This is based on the hadith of Aisha (RA) who said: 'We were ordered to make up the fasts but not the prayers.' (Sahih al-Bukhari 321, Sahih Muslim 335)" },
  { q: "Is observing Fast prohibited during one's period?", a: "Yes, fasting is prohibited during menstruation. However, unlike Salah, a woman must make up the missed fasts after her period ends and she becomes pure. This is the consensus of all four madhahib. (Sahih al-Bukhari 321)" },
  { q: "Is it allowed to do Dhikr during periods?", a: "Yes, a menstruating woman can do dhikr (remembrance of Allah), make dua (supplication), say SubhanAllah, Alhamdulillah, Allahu Akbar, and send blessings upon the Prophet ﷺ. There is no restriction on dhikr during menstruation." },
  { q: "Is it allowed to recite the Quran without touching the Holy book during periods?", a: "There is scholarly difference on this. The Hanafi, Shafi'i, and Hanbali schools generally prohibit reciting the Quran during menstruation, while the Maliki school and some scholars like Ibn Taymiyyah permit it, especially for memorization or teaching. Many contemporary scholars allow recitation from memory or digital devices without touching the Mushaf." },
  { q: "Is it allowed to listen to the recitation of the Quran during periods?", a: "Yes, it is unanimously permissible for a menstruating woman to listen to Quran recitation. There is no restriction on this, and it is encouraged as a form of worship and spiritual connection." },
  { q: "What activities are prohibited during menstruation?", a: "The following are prohibited during menstruation: 1) Salah (prayer), 2) Fasting, 3) Sexual intercourse, 4) Tawaf around the Ka'bah, 5) Entering the mosque (according to the majority). Physical intimacy without intercourse is permitted based on authentic hadith." },
  { q: "What's the command on observing Salah during pregnancy?", a: "Pregnancy does not exempt a woman from Salah. She must continue to pray as normal. If she experiences bleeding during pregnancy (istihadah/abnormal bleeding), she should perform wudu for each prayer and continue praying. Salah is only waived during actual menstruation or nifas (postnatal bleeding)." },
  { q: "Is it obligatory to observe missed Salahs once the period ends?", a: "No, a woman is NOT required to make up the Salah (prayers) she missed during her period. This is the consensus of all scholars, based on the hadith of Aisha (RA) in Sahih al-Bukhari. However, she must make up missed fasts." },
  { q: "Is it obligatory to observe missed fard Fasts once the period ends?", a: "Yes, it is obligatory to make up the missed fard (obligatory) fasts from Ramadan. A woman should make them up before the next Ramadan arrives, though she can spread them throughout the year. This is based on the hadith of Aisha (RA) who said she used to make up fasts in Sha'ban." },
  { q: "What to do if one's period starts in between Fasting?", a: "If menstruation begins during the day while fasting, the fast is broken and she must stop fasting immediately. She should eat and drink normally. This day must be made up later. She should not feel guilty as this is Allah's decree and there is no sin in it." },
  { q: "What is the proper way of taking a ghusl after the period ends?", a: "The steps for ghusl after menstruation: 1) Make the intention (niyyah) for purification, 2) Say 'Bismillah', 3) Wash both hands three times, 4) Wash private parts, 5) Perform full wudu, 6) Pour water over the head three times, ensuring it reaches the roots of the hair, 7) Wash the entire body starting from the right side then the left, 8) Make sure water reaches every part of the body. The Prophet ﷺ advised Aisha (RA) to use a piece of cloth with musk for purification (Sahih Muslim 332)." },
  { q: "What is the minimum and maximum duration of menstruation?", a: "Scholars differ on this. The Hanafi school says minimum is 3 days and maximum is 10 days. The Shafi'i and Hanbali schools say minimum is 1 day and maximum is 15 days. The Maliki school says there is no minimum but maximum is 15 days. If bleeding exceeds the maximum, it is considered istihadah (abnormal bleeding) and the woman should pray and fast." },
];

const TIPS = [
  { title: "Stay Hydrated", desc: "Drink plenty of water and warm fluids to ease cramps and stay comfortable." },
  { title: "Healthy Diet", desc: "Eat iron-rich foods like spinach, dates, and lentils to replenish what you lose." },
  { title: "Light Exercise", desc: "Gentle walks and stretching can help relieve cramping and improve mood." },
  { title: "Duas & Dhikr", desc: "Keep your tongue moist with dhikr. Make dua for patience and ease." },
  { title: "Track Your Cycle", desc: "Keep a record to know your regular pattern. This helps in calculating prayer & fasting schedules." },
  { title: "Rest Well", desc: "Get adequate sleep and don't overburden yourself during this time." },
];

export default function MenstrualGuide() {
  const [openIdx, setOpenIdx] = useState(null);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/more" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Women's Guide</p>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Menstrual Guide</h1>
        </div>
      </div>

      <p className="mb-8 rounded-2xl border border-pink-200 bg-pink-50 p-5 text-sm text-pink-800 dark:border-pink-900 dark:bg-pink-950/30 dark:text-pink-300">
        💕 This guide provides Islamic rulings regarding menstruation based on authentic hadith and scholarly consensus. All rulings are from mainstream Sunni fiqh. Always consult a knowledgeable scholar for your specific situation.
      </p>

      {/* Health Tips */}
      <h2 className="mb-4 font-heading text-lg font-bold">Your Health & Spiritual Guide</h2>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TIPS.map((tip, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <h3 className="font-heading text-sm font-semibold">{tip.title}</h3>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
          </div>
        ))}
      </div>

      {/* FAQs */}
      <h2 className="mb-4 font-heading text-lg font-bold">Frequently Asked Questions</h2>
      <div className="space-y-2">
        {FAQS.map((faq, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 p-5 text-left"
            >
              <span className="text-sm font-semibold">{faq.q}</span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${openIdx === i ? "rotate-180" : ""}`} />
            </button>
            {openIdx === i && (
              <div className="border-t border-border px-5 py-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
