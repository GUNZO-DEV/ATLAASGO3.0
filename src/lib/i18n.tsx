import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'EN' | 'FR' | 'AR';

type Dict = Record<string, string>;

const DICT: Record<Lang, Dict> = {
  EN: {
    'nav.order': 'Order',
    'nav.campus': 'Campus',
    'nav.partners': 'Partners',
    'nav.drive': 'Drive',
    'nav.business': 'Business',
    'nav.signin': 'Sign In',
    'hero.eyebrow': "Live in Ifrane · AUI Campus · Atlas Region",
    'hero.title.l1': "Ifrane's premium",
    'hero.title.l2': 'delivery,',
    'hero.title.accent': 'redefined.',
    'hero.lead':
      "Food, groceries, and dorm-drops — built for the Atlas. From medina kitchens to AUI residences in under 30 minutes, with the quality you'd expect from a world-class app.",
    'hero.toggle.food': 'Food',
    'hero.toggle.services': 'Services',
    'hero.cta.primary': 'Order Food',
    'hero.cta.secondary': 'Campus Delivery (AUIER)',
    'hero.trust.partners': 'Local Restaurants',
    'hero.trust.eta': 'Avg. Delivery',
    'hero.trust.students': '2,400+ AUI students',
    'legends.tag': 'Local Legends',
    'legends.title.l1': 'The kitchens locals',
    'legends.title.l2': 'swear by.',
    'legends.sub':
      "Five verified Ifrane partners hand-picked by our team. Real recipes, real reputations — only places we'd send our own families.",
    'legends.viewall': 'View all 28 partners',
    'how.tag': 'How It Works',
    'how.title.l1': 'Three taps from craving',
    'how.title.l2': 'to your doorstep.',
    'restaurants.tag': 'Featured This Week',
    'restaurants.title.l1': 'Hungry? Pick your',
    'restaurants.title.l2': 'flavor of Ifrane.',
    'restaurants.sub':
      'Filters stack — combine Italian + Moroccan for one delicious cross-cultural cart.',
    'persona.tag': 'Built For Everyone',
    'persona.title.l1': 'One ecosystem.',
    'persona.title.l2': 'Three ways to win.',
    'pwa.eyebrow': 'Install. No App Store needed.',
    'pwa.title.l1': 'Get AtlaasGo on your',
    'pwa.title.l2': 'home screen.',
    'pwa.lead':
      'Install our PWA in two taps. Works offline, gets push updates, and feels exactly like a native app — because it is one.',
    'order.title': 'Order from Ifrane',
    'order.sub': 'Filter by cuisine, dietary needs, or delivery time.',
    'cart.title': 'Your cart',
    'cart.empty.title': 'Your cart is empty',
    'cart.empty.sub': 'Add a few favourites from our partners and they\'ll show up here.',
    'cart.browse': 'Browse restaurants',
    'cart.subtotal': 'Subtotal',
    'cart.delivery': 'Delivery fee',
    'cart.service': 'Service',
    'cart.total': 'Total',
    'cart.checkout': 'Place order',
    'track.title': 'Tracking your order',
    'auth.signin': 'Welcome back',
    'auth.signup': 'Create your account',
    'auth.signin.sub': 'Sign in to track orders, save favourites, and earn Prime perks.',
    'auth.signup.sub': 'It takes 30 seconds and gets you free first-week deliveries.',
    'rider.title': 'Rider dashboard',
    'rider.sub': "Today's earnings, route, and performance at a glance.",
    'merchant.title': 'Merchant console',
    'merchant.sub': 'Live orders, kitchen tickets, and revenue — your restaurant in one place.',
    'common.minutes': 'min',
    'common.free': 'Free',
    'common.delivery': 'Free delivery',
    'common.add': 'Add',
  },
  FR: {
    'nav.order': 'Commander',
    'nav.campus': 'Campus',
    'nav.partners': 'Partenaires',
    'nav.drive': 'Livrer',
    'nav.business': 'Pro',
    'nav.signin': 'Connexion',
    'hero.eyebrow': 'Disponible à Ifrane · Campus AUI · Région de l\'Atlas',
    'hero.title.l1': 'La livraison premium',
    'hero.title.l2': "d'Ifrane,",
    'hero.title.accent': 'réinventée.',
    'hero.lead':
      'Repas, courses et livraisons aux dortoirs — pensés pour l\'Atlas. Des cuisines de la médina aux résidences AUI en moins de 30 minutes, avec la qualité d\'une app de classe mondiale.',
    'hero.toggle.food': 'Repas',
    'hero.toggle.services': 'Services',
    'hero.cta.primary': 'Commander',
    'hero.cta.secondary': 'Livraison campus (AUIER)',
    'hero.trust.partners': 'Restaurants locaux',
    'hero.trust.eta': 'Livraison moy.',
    'hero.trust.students': '2 400+ étudiants AUI',
    'legends.tag': 'Légendes locales',
    'legends.title.l1': 'Les cuisines que les',
    'legends.title.l2': 'habitants adorent.',
    'legends.sub':
      'Cinq partenaires ifranis vérifiés, choisis par notre équipe. Vraies recettes, vraies réputations — uniquement des adresses que nous recommandons à nos familles.',
    'legends.viewall': 'Voir les 28 partenaires',
    'how.tag': 'Comment ça marche',
    'how.title.l1': 'Trois clics entre l\'envie',
    'how.title.l2': 'et votre porte.',
    'restaurants.tag': 'À la une cette semaine',
    'restaurants.title.l1': 'Faim ? Choisissez votre',
    'restaurants.title.l2': 'Ifrane préféré.',
    'restaurants.sub':
      'Les filtres se cumulent — combinez italien et marocain pour un panier interculturel délicieux.',
    'persona.tag': 'Pour tout le monde',
    'persona.title.l1': 'Un écosystème.',
    'persona.title.l2': 'Trois manières de gagner.',
    'pwa.eyebrow': 'Installation sans App Store.',
    'pwa.title.l1': 'AtlaasGo sur votre',
    'pwa.title.l2': 'écran d\'accueil.',
    'pwa.lead':
      'Installez notre PWA en deux taps. Fonctionne hors ligne, notifications push, et ressemble à une vraie app — parce que c\'en est une.',
    'order.title': 'Commander à Ifrane',
    'order.sub': 'Filtrez par cuisine, régime alimentaire ou temps de livraison.',
    'cart.title': 'Votre panier',
    'cart.empty.title': 'Votre panier est vide',
    'cart.empty.sub': 'Ajoutez quelques favoris de nos partenaires et ils apparaîtront ici.',
    'cart.browse': 'Voir les restaurants',
    'cart.subtotal': 'Sous-total',
    'cart.delivery': 'Frais de livraison',
    'cart.service': 'Service',
    'cart.total': 'Total',
    'cart.checkout': 'Passer la commande',
    'track.title': 'Suivi de commande',
    'auth.signin': 'Heureux de vous revoir',
    'auth.signup': 'Créez votre compte',
    'auth.signin.sub': 'Connectez-vous pour suivre vos commandes et gagner des avantages Prime.',
    'auth.signup.sub': 'En 30 secondes. Vos livraisons de la première semaine sont gratuites.',
    'rider.title': 'Tableau du livreur',
    'rider.sub': 'Gains du jour, itinéraire et performance en un coup d\'œil.',
    'merchant.title': 'Console marchand',
    'merchant.sub': 'Commandes en direct, tickets cuisine, revenus — votre restaurant en un seul endroit.',
    'common.minutes': 'min',
    'common.free': 'Gratuit',
    'common.delivery': 'Livraison gratuite',
    'common.add': 'Ajouter',
  },
  AR: {
    'nav.order': 'اطلب',
    'nav.campus': 'الحرم',
    'nav.partners': 'شركاؤنا',
    'nav.drive': 'موصِّل',
    'nav.business': 'الأعمال',
    'nav.signin': 'تسجيل الدخول',
    'hero.eyebrow': 'متاح في إفران · حرم AUI · منطقة الأطلس',
    'hero.title.l1': 'توصيل إفران',
    'hero.title.l2': 'الفاخر،',
    'hero.title.accent': 'بحلّة جديدة.',
    'hero.lead':
      'طعام، بقالة، وتوصيل للسكن الجامعي — مصمَّم للأطلس. من مطابخ المدينة إلى إقامات AUI في أقل من 30 دقيقة، بجودة عالمية.',
    'hero.toggle.food': 'طعام',
    'hero.toggle.services': 'خدمات',
    'hero.cta.primary': 'اطلب الطعام',
    'hero.cta.secondary': 'توصيل الحرم (AUIER)',
    'hero.trust.partners': 'مطاعم محلية',
    'hero.trust.eta': 'متوسط التوصيل',
    'hero.trust.students': 'أكثر من 2,400 طالب AUI',
    'legends.tag': 'أساطير المدينة',
    'legends.title.l1': 'المطابخ التي يقسم',
    'legends.title.l2': 'بها السكان.',
    'legends.sub':
      'خمسة شركاء من إفران اختارهم فريقنا بعناية. وصفات حقيقية، سمعة حقيقية — أماكن نرسل إليها عائلاتنا.',
    'legends.viewall': 'استعرض جميع الشركاء (28)',
    'how.tag': 'كيف يعمل',
    'how.title.l1': 'ثلاث لمسات من الرغبة',
    'how.title.l2': 'إلى عتبة بابك.',
    'restaurants.tag': 'مميزات هذا الأسبوع',
    'restaurants.title.l1': 'جوعان؟ اختر',
    'restaurants.title.l2': 'نكهة إفران.',
    'restaurants.sub': 'يمكن دمج المرشحات — جرّب الإيطالي والمغربي في سلة واحدة.',
    'persona.tag': 'مصمَّم للجميع',
    'persona.title.l1': 'نظام واحد.',
    'persona.title.l2': 'ثلاث طرق للنجاح.',
    'pwa.eyebrow': 'تثبيت بدون متجر تطبيقات.',
    'pwa.title.l1': 'احصل على AtlaasGo',
    'pwa.title.l2': 'على شاشتك الرئيسية.',
    'pwa.lead':
      'ثبّت تطبيقنا في لمستين. يعمل دون اتصال، يستقبل الإشعارات، ويبدو كتطبيق أصلي — لأنه كذلك.',
    'order.title': 'اطلب من إفران',
    'order.sub': 'فلتر حسب المطبخ، النظام الغذائي، أو وقت التوصيل.',
    'cart.title': 'سلتك',
    'cart.empty.title': 'سلتك فارغة',
    'cart.empty.sub': 'أضف بعض المفضلات من شركائنا وستظهر هنا.',
    'cart.browse': 'استعرض المطاعم',
    'cart.subtotal': 'المجموع الفرعي',
    'cart.delivery': 'رسوم التوصيل',
    'cart.service': 'الخدمة',
    'cart.total': 'الإجمالي',
    'cart.checkout': 'تأكيد الطلب',
    'track.title': 'تتبع طلبك',
    'auth.signin': 'أهلاً بعودتك',
    'auth.signup': 'أنشئ حسابك',
    'auth.signin.sub': 'سجّل الدخول لتتبع الطلبات وتجميع مزايا Prime.',
    'auth.signup.sub': 'في 30 ثانية. توصيل مجاني لأول أسبوع.',
    'rider.title': 'لوحة الموصِّل',
    'rider.sub': 'أرباح اليوم والمسار والأداء بنظرة واحدة.',
    'merchant.title': 'وحدة تحكم التاجر',
    'merchant.sub': 'الطلبات الحية، تذاكر المطبخ، والإيرادات — مطعمك في مكان واحد.',
    'common.minutes': 'د',
    'common.free': 'مجاناً',
    'common.delivery': 'توصيل مجاني',
    'common.add': 'أضف',
  },
};

type I18nCtx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string) => string; dir: 'ltr' | 'rtl' };
const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('atlaasgo-lang') as Lang) || 'EN');
  const dir = lang === 'AR' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang.toLowerCase();
    localStorage.setItem('atlaasgo-lang', lang);
  }, [lang, dir]);

  const value = useMemo<I18nCtx>(() => {
    const dict = DICT[lang];
    const t = (k: string) => dict[k] ?? DICT.EN[k] ?? k;
    return { lang, setLang, t, dir };
  }, [lang, dir]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useI18n must be used inside I18nProvider');
  return c;
}
