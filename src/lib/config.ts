/**
 * ---------------------------------------------------------------------------
 * BRANDING & SITE CONFIGURATION
 * ---------------------------------------------------------------------------
 * This is the single place to change the Board's identity. Everything else in
 * the app — page titles, SEO metadata, the footer, email signatures — reads
 * from here.
 *
 * >>> PLACEHOLDERS: every value marked TODO is a stand-in. Replace them. <<<
 */

export const site = {
  boardName: "EIC",

  /** Short form used in tight spaces (nav, mobile header, email subjects). */
  shortName: "EIC",

  /**
   * The letters in the logo mark. One to three characters — more won't fit the
   * square.
   */
  monogram: "EIC",

  schoolName: "Osei Tutu Senior High School",

  /**
   * What EIC stands for.
   *
   * Shown under the About page heading and used in SEO — search engines and
   * people who don't already know the initials both need the words.
   */
  fullName: "Editors and Information Committee",

  /** TODO: a one-line description. Used as the default SEO description. */
  tagline: "Recording, reporting, and preserving the story of our school.",

  description:
    "The official home of the Editors and Information Committee (EIC) of Osei Tutu Senior High School — our publications, news, events, and the record of our work.",

  /** TODO: the live URL once deployed. Used for SEO canonicals and sitemaps. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  /**
   * TODO: real contact details.
   *
   * Left empty rather than filled with a plausible-looking address — a wrong
   * email on a live contact page loses real messages. Anything empty here is
   * simply not rendered. Messages sent through the site's form reach
   * executives regardless of what's set here.
   */
  contact: {
    email: "",
    phone: "",
    address: "",
  },

  /** TODO: real handles. Leave a value empty to hide that icon. */
  social: {
    instagram: "",
    x: "",
    facebook: "",
    youtube: "",
  },

  /** Set null to hide the "Established …" line everywhere it appears. */
  foundedYear: 2018 as number | null,
} as const;

/**
 * The Board's mission and structure, shown on the About page.
 * TODO: replace with the Board's actual wording.
 */
export const about = {
  mission:
    "We exist to record the life of our school honestly and well — to report what happens, to give students a place to write, and to leave behind a record that the years after us can read.",

  what: [
    {
      title: "We publish",
      body: "Newsletters, magazines, and features written, edited, and laid out entirely by students.",
    },
    {
      title: "We record",
      body: "Meetings, events, and milestones — documented and archived so nothing is lost between one Board and the next.",
    },
    {
      title: "We train",
      body: "New members learn writing, editing, photography, and layout from the members ahead of them.",
    },
  ],

  /**
   * The Board's internal structure. This describes the *roles*; the actual
   * people are pulled from the database (any member flagged as an executive).
   */
  structure: [
    {
      name: "Executive Committee",
      body: "Sets direction, approves what goes to print, and represents the Board to the school.",
    },
    {
      name: "Editorial Desk",
      body: "Commissions, edits, and fact-checks everything the Board publishes.",
    },
    {
      name: "Design & Media",
      body: "Layout, photography, and the visual identity of every issue.",
    },
    {
      name: "General Membership",
      body: "Writers, reporters, and contributors — where every member of the Board starts.",
    },
  ],
} as const;

/**
 * Areas a prospective member can express interest in, on the Join form.
 * TODO: adjust to match how the Board is actually organised.
 */
export const interestAreas = [
  "Writing / Reporting",
  "Editing / Proofreading",
  "Photography",
  "Design & Layout",
  "Social Media",
  "Events & Logistics",
] as const;

/** Where email is sent from. Overridable per-environment. */
export const emailFrom =
  process.env.EMAIL_FROM ?? `${site.shortName} <onboarding@resend.dev>`;

/**
 * ---------------------------------------------------------------------------
 * SMS
 * ---------------------------------------------------------------------------
 * Used only for urgent broadcasts — the things members must know about before
 * they next open the portal.
 */
export const sms = {
  /**
   * Ghana. Members type their numbers in local form (`024 412 3456`); this is
   * what turns that into the `+233244123456` Twilio needs.
   */
  defaultCountryCode: "233",

  /**
   * How many digits a national number has once the trunk `0` is removed.
   * Ghana: 9 (`024 412 3456` → `244123456`).
   *
   * This exists to resolve a genuine ambiguity. Someone may type their number
   * with the country code but no `+` (`233 24 412 3456`), and that string is
   * already complete — but Ghana's own `023x` numbers *also* begin with `233`
   * once the trunk zero is stripped, so the prefix alone cannot tell the two
   * apart. The length can: `233244123456` is 12 digits (country code + 9),
   * while `0233123456` is 9. See `normalisePhone`.
   */
  nationalNumberLength: 9,

  /**
   * TODO: what Twilio charges you per message segment to Ghana, in pesewas.
   *
   * Only used for the estimate shown before sending. Twilio publishes per-country
   * SMS pricing — put the real figure here so executives see a number they can
   * trust rather than a guess.
   */
  costPerSegmentMinor: 4,

  /** TODO: confirm against your Twilio bill — Twilio may charge you in USD. */
  currency: "GHS",
  currencySymbol: "GH₵",

  /**
   * Prefix put in front of every broadcast so recipients know who it's from —
   * an SMS arrives with no context beyond a number.
   *
   * Counts towards the character limit. Keep it short, or set it to "" if your
   * provider already sends under an alphanumeric sender ID.
   */
  prefix: "[EIC] ",
} as const;
