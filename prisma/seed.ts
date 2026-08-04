/**
 * Seed data.
 *
 * Gives you a system you can actually click through: four roles, a filled
 * document library, a calendar with RSVPs, published news, and an archive.
 *
 * Safe to re-run — everything is upserted on a natural key.
 *
 * Run with:  npm run db:seed
 */

import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { promises as fs } from "node:fs";
import path from "node:path";

const db = new PrismaClient();

const PASSWORD = process.env.SEED_PASSWORD ?? "ChangeMe!2024";

/** Dates relative to now, so the calendar always looks alive. */
const now = new Date();
const days = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return d;
};
const at = (date: Date, hour: number, minute = 0) => {
  const d = new Date(date);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const PEOPLE: {
  email: string;
  name: string;
  role: Role;
  position: string;
  classYear: string;
  isExecutive: boolean;
  execOrder: number;
  bio?: string;
  /** Local format on purpose — normalisePhone() has to cope with real input. */
  phone?: string;
  smsNotifications?: boolean;
}[] = [
  {
    email: "admin@oseitutushs.edu.gh",
    phone: "024 412 3456",
    name: "Ama Boateng",
    role: "ADMIN",
    position: "Editor-in-Chief",
    classYear: "Class of 2026",
    isExecutive: true,
    execOrder: 1,
    bio: "Runs the Board, chairs the weekly meeting, and has the final say on what goes to print.",
  },
  {
    email: "exec@oseitutushs.edu.gh",
    phone: "0244123457",
    name: "Kwame Mensah",
    role: "EXECUTIVE",
    position: "Deputy Editor",
    classYear: "Class of 2026",
    isExecutive: true,
    execOrder: 2,
    bio: "Commissions features and keeps the publication schedule honest.",
  },
  {
    email: "secretary@oseitutushs.edu.gh",
    phone: "+233 24 412 3458",
    name: "Efua Danso",
    role: "EXECUTIVE",
    position: "Secretary",
    classYear: "Class of 2027",
    isExecutive: true,
    execOrder: 3,
    bio: "Keeps the minutes, the attendance register, and the Board's memory.",
  },
  {
    email: "editor@oseitutushs.edu.gh",
    phone: "0203344551",
    name: "Yaw Osei",
    role: "EDITOR",
    position: "Features Editor",
    classYear: "Class of 2027",
    isExecutive: false,
    execOrder: 0,
    bio: "Edits long-form features and runs the sub-editing desk.",
  },
  {
    email: "design@oseitutushs.edu.gh",
    phone: "024 412 3460",
    name: "Akosua Frimpong",
    role: "EDITOR",
    position: "Layout & Design Editor",
    classYear: "Class of 2027",
    isExecutive: true,
    execOrder: 4,
    bio: "Responsible for how every issue looks on the page.",
  },
  {
    email: "member@oseitutushs.edu.gh",
    phone: "0244123461",
    name: "Kofi Asante",
    role: "MEMBER",
    position: "Staff Writer",
    classYear: "Class of 2028",
    isExecutive: false,
    execOrder: 0,
  },
  {
    email: "photo@oseitutushs.edu.gh",
    phone: "0244123462",
    smsNotifications: false,
    name: "Adwoa Nyarko",
    role: "MEMBER",
    position: "Photographer",
    classYear: "Class of 2028",
    isExecutive: false,
    execOrder: 0,
  },
  {
    email: "reporter@oseitutushs.edu.gh",
    name: "Kojo Appiah",
    role: "MEMBER",
    position: "Reporter",
    classYear: "Class of 2029",
    isExecutive: false,
    execOrder: 0,
  },
];

async function main() {
  if (process.env.NODE_ENV === "production" && !process.env.SEED_PASSWORD) {
    throw new Error(
      "Refusing to seed in production without SEED_PASSWORD set. " +
        "Set it to a password you actually intend to use.",
    );
  }

  console.log("Seeding…");

  // --- People -------------------------------------------------------------
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const users = await Promise.all(
    PEOPLE.map((p, i) =>
      db.user.upsert({
        where: { email: p.email },
        update: {
          name: p.name,
          role: p.role,
          position: p.position,
          classYear: p.classYear,
          isExecutive: p.isExecutive,
          execOrder: p.execOrder,
          bio: p.bio ?? null,
          phone: p.phone ?? null,
          smsNotifications: p.smsNotifications ?? true,
        },
        create: {
          email: p.email,
          name: p.name,
          passwordHash,
          role: p.role,
          status: "ACTIVE",
          position: p.position,
          classYear: p.classYear,
          isExecutive: p.isExecutive,
          execOrder: p.execOrder,
          bio: p.bio ?? null,
          phone: p.phone ?? null,
          smsNotifications: p.smsNotifications ?? true,
          showEmail: true,
          showPhone: false,
          joinedAt: days(-320 + i * 30),
          lastLoginAt: days(-i),
        },
      }),
    ),
  );

  const byEmail = (email: string) => {
    const u = users.find((x) => x.email === email);
    if (!u) throw new Error(`Seed user missing: ${email}`);
    return u;
  };

  const admin = byEmail("admin@oseitutushs.edu.gh");
  const deputy = byEmail("exec@oseitutushs.edu.gh");
  const secretary = byEmail("secretary@oseitutushs.edu.gh");
  const features = byEmail("editor@oseitutushs.edu.gh");
  const design = byEmail("design@oseitutushs.edu.gh");
  const writer = byEmail("member@oseitutushs.edu.gh");
  const photographer = byEmail("photo@oseitutushs.edu.gh");
  const reporter = byEmail("reporter@oseitutushs.edu.gh");

  console.log(`  ${users.length} members`);

  // --- Folders & tags -----------------------------------------------------
  const folderSpecs = [
    { name: "Meeting minutes", slug: "meeting-minutes" },
    { name: "Reports", slug: "reports" },
    { name: "Templates & guidelines", slug: "templates-guidelines" },
    { name: "Governance", slug: "governance" },
  ];

  const folders = await Promise.all(
    folderSpecs.map((f) =>
      db.folder.upsert({
        where: { slug: f.slug },
        update: {},
        create: f,
      }),
    ),
  );
  const folder = (slug: string) => folders.find((f) => f.slug === slug)!;

  const tagSpecs = [
    { name: "minutes", slug: "minutes" },
    { name: "term-1", slug: "term-1" },
    { name: "term-2", slug: "term-2" },
    { name: "finance", slug: "finance" },
    { name: "training", slug: "training" },
    { name: "style", slug: "style" },
  ];

  const tags = await Promise.all(
    tagSpecs.map((t) =>
      db.tag.upsert({ where: { slug: t.slug }, update: {}, create: t }),
    ),
  );
  const tag = (slug: string) => tags.find((t) => t.slug === slug)!;

  // --- Documents ----------------------------------------------------------
  // Each seeded document gets a real placeholder file written into the same
  // local upload directory a genuine upload would use. That keeps every
  // download link working *and* keeps restricted documents behind the
  // permission check in app/uploads/[...path]/route.ts — a placeholder served
  // out of `public/` would be readable by anyone, which would quietly
  // misrepresent how the permission model behaves.
  const uploadDir = path.join(process.cwd(), ".uploads", "documents");
  await fs.mkdir(uploadDir, { recursive: true });

  const writePlaceholder = async (title: string) => {
    const name = `seed-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.txt`;
    const body =
      `${title}\n\n` +
      "This is placeholder content created by the seed script so that every\n" +
      "document in the demo library is a working download. Replace it by\n" +
      "uploading the real file through Admin -> Documents.\n";
    await fs.writeFile(path.join(uploadDir, name), body, "utf8");
    return { url: `/uploads/documents/${name}`, size: Buffer.byteLength(body) };
  };

  const documentSpecs = [
    {
      title: "Minutes — General Meeting, Week 1",
      description:
        "Attendance, the term's publication schedule, and the vote on the new masthead.",
      type: "MINUTES" as const,
      folderId: folder("meeting-minutes").id,
      tagSlugs: ["minutes", "term-1"],
      recordDate: days(-52),
      uploadedById: secretary.id,
      minRole: "MEMBER" as const,
    },
    {
      title: "Minutes — Executive Committee, Week 3",
      description: "Budget review and the decision on print quantities.",
      type: "MINUTES" as const,
      folderId: folder("meeting-minutes").id,
      tagSlugs: ["minutes", "finance"],
      recordDate: days(-38),
      uploadedById: secretary.id,
      // Executive-only, so the role filter is visibly doing something.
      minRole: "EXECUTIVE" as const,
    },
    {
      title: "Minutes — General Meeting, Week 5",
      description: "Feature pitches and photography assignments for the term.",
      type: "MINUTES" as const,
      folderId: folder("meeting-minutes").id,
      tagSlugs: ["minutes", "term-2"],
      recordDate: days(-21),
      uploadedById: secretary.id,
      minRole: "MEMBER" as const,
    },
    {
      title: "Attendance register — Term 1",
      description: "Meeting-by-meeting attendance for every member.",
      type: "ATTENDANCE" as const,
      folderId: folder("reports").id,
      tagSlugs: ["term-1"],
      recordDate: days(-30),
      uploadedById: secretary.id,
      minRole: "EXECUTIVE" as const,
    },
    {
      title: "Termly report to the school administration",
      description:
        "What the Board published, what it spent, and what it plans next term.",
      type: "REPORT" as const,
      folderId: folder("reports").id,
      tagSlugs: ["term-1", "finance"],
      recordDate: days(-14),
      uploadedById: admin.id,
      minRole: "MEMBER" as const,
      isPublic: true,
    },
    {
      title: "House style guide",
      description:
        "Spelling, punctuation, headline case, and how we handle names and titles.",
      type: "GUIDELINE" as const,
      folderId: folder("templates-guidelines").id,
      tagSlugs: ["style", "training"],
      recordDate: days(-180),
      uploadedById: features.id,
      minRole: "MEMBER" as const,
    },
    {
      title: "Article submission template",
      description: "Use this for every draft you hand in.",
      type: "TEMPLATE" as const,
      folderId: folder("templates-guidelines").id,
      tagSlugs: ["style"],
      recordDate: days(-170),
      uploadedById: features.id,
      minRole: "MEMBER" as const,
    },
    {
      title: "EIC constitution",
      description:
        "How the Board is constituted, how executives are elected, and what each office does.",
      type: "CONSTITUTION" as const,
      folderId: folder("governance").id,
      tagSlugs: [],
      recordDate: days(-400),
      uploadedById: admin.id,
      minRole: "MEMBER" as const,
      isPublic: true,
    },
  ];

  for (const spec of documentSpecs) {
    const existing = await db.document.findFirst({
      where: { title: spec.title },
      select: { id: true },
    });
    if (existing) continue;

    const placeholder = await writePlaceholder(spec.title);

    await db.document.create({
      data: {
        title: spec.title,
        description: spec.description,
        type: spec.type,
        folderId: spec.folderId,
        recordDate: spec.recordDate,
        uploadedById: spec.uploadedById,
        minRole: spec.minRole,
        isPublic: spec.isPublic ?? false,
        fileUrl: placeholder.url,
        fileName: `${spec.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`,
        fileSize: placeholder.size,
        mimeType: "text/plain",
        tags: { connect: spec.tagSlugs.map((s) => ({ id: tag(s).id })) },
      },
    });
  }

  console.log(`  ${documentSpecs.length} documents`);

  // --- Events -------------------------------------------------------------
  const eventSpecs = [
    {
      title: "General Meeting",
      description:
        "Our standing weekly meeting. Bring your drafts and be ready to pitch.",
      agenda:
        "1. Attendance and apologies\n\n2. Minutes of the last meeting\n\n3. Progress on the current issue\n\n4. New pitches\n\n5. Any other business",
      location: "Library, Room 4",
      type: "MEETING" as const,
      startsAt: at(days(3), 15, 30),
      endsAt: at(days(3), 17, 0),
      isPublic: false,
      requiredMaterials: "Notebook, current drafts",
      createdById: admin.id,
    },
    {
      title: "Copy deadline — Issue 3",
      description:
        "All articles for Issue 3 must be submitted by end of day. No extensions this time.",
      type: "DEADLINE" as const,
      startsAt: at(days(8), 17, 0),
      allDay: false,
      isPublic: false,
      createdById: deputy.id,
    },
    {
      title: "Photography workshop",
      description:
        "Composition, available light, and how to shoot an event without getting in the way. Open to everyone.",
      agenda:
        "Part 1 — Framing and composition\n\nPart 2 — Working in bad light\n\nPart 3 — Practical: shoot the quad",
      location: "Art Room",
      type: "TRAINING" as const,
      startsAt: at(days(12), 14, 0),
      endsAt: at(days(12), 16, 0),
      isPublic: true,
      requiredMaterials: "A camera or a phone",
      createdById: design.id,
    },
    {
      title: "Issue 3 goes to print",
      description: "Final files to the printer. Nothing changes after this.",
      type: "PUBLICATION" as const,
      startsAt: at(days(20), 9, 0),
      allDay: true,
      isPublic: true,
      createdById: admin.id,
    },
    {
      title: "Executive Committee meeting",
      description: "Budget, the next intake, and prize entries.",
      location: "Staff Room Annexe",
      type: "MEETING" as const,
      startsAt: at(days(5), 13, 0),
      endsAt: at(days(5), 14, 0),
      isPublic: false,
      // Only executives and above see this one.
      minRole: "EXECUTIVE" as const,
      createdById: admin.id,
    },
    {
      title: "Magazine launch — Issue 2",
      description:
        "The launch of our second issue, with readings from three of the contributors.",
      location: "School Hall",
      type: "SOCIAL" as const,
      startsAt: at(days(-25), 16, 0),
      endsAt: at(days(-25), 18, 0),
      isPublic: true,
      createdById: admin.id,
    },
    {
      title: "General Meeting",
      description: "Weekly meeting.",
      location: "Library, Room 4",
      type: "MEETING" as const,
      startsAt: at(days(-4), 15, 30),
      endsAt: at(days(-4), 17, 0),
      isPublic: false,
      createdById: admin.id,
    },
  ];

  const events = [];
  for (const spec of eventSpecs) {
    const existing = await db.event.findFirst({
      where: { title: spec.title, startsAt: spec.startsAt },
      select: { id: true },
    });
    if (existing) {
      events.push(existing);
      continue;
    }
    const created = await db.event.create({
      data: {
        title: spec.title,
        description: spec.description ?? null,
        agenda: spec.agenda ?? null,
        location: spec.location ?? null,
        type: spec.type,
        startsAt: spec.startsAt,
        endsAt: spec.endsAt ?? null,
        allDay: spec.allDay ?? false,
        isPublic: spec.isPublic,
        minRole: spec.minRole ?? "MEMBER",
        requiredMaterials: spec.requiredMaterials ?? null,
        createdById: spec.createdById,
      },
    });
    events.push(created);
  }

  console.log(`  ${events.length} events`);

  // --- RSVPs --------------------------------------------------------------
  const nextMeeting = events[0];
  const pastMeeting = events[events.length - 1];

  const rsvpPlan: { eventId: string; userId: string; status: "ATTENDING" | "NOT_ATTENDING" | "MAYBE"; attended?: boolean }[] = [
    { eventId: nextMeeting.id, userId: admin.id, status: "ATTENDING" },
    { eventId: nextMeeting.id, userId: deputy.id, status: "ATTENDING" },
    { eventId: nextMeeting.id, userId: secretary.id, status: "ATTENDING" },
    { eventId: nextMeeting.id, userId: features.id, status: "MAYBE" },
    { eventId: nextMeeting.id, userId: writer.id, status: "ATTENDING" },
    { eventId: nextMeeting.id, userId: reporter.id, status: "NOT_ATTENDING" },
    // The past meeting also carries an attendance record.
    { eventId: pastMeeting.id, userId: admin.id, status: "ATTENDING", attended: true },
    { eventId: pastMeeting.id, userId: deputy.id, status: "ATTENDING", attended: true },
    { eventId: pastMeeting.id, userId: secretary.id, status: "ATTENDING", attended: true },
    { eventId: pastMeeting.id, userId: writer.id, status: "ATTENDING", attended: false },
    { eventId: pastMeeting.id, userId: photographer.id, status: "MAYBE", attended: true },
  ];

  for (const r of rsvpPlan) {
    await db.rsvp.upsert({
      where: { eventId_userId: { eventId: r.eventId, userId: r.userId } },
      update: { status: r.status, attended: r.attended ?? null },
      create: {
        eventId: r.eventId,
        userId: r.userId,
        status: r.status,
        attended: r.attended ?? null,
      },
    });
  }

  // --- Announcements ------------------------------------------------------
  const announcementSpecs = [
    {
      title: "Copy deadline for Issue 3 is next Friday",
      body: "Everything for Issue 3 needs to be with the desk by 5pm next Friday — that includes photographs and captions.\n\nIf you know now that you won't make it, tell your editor today rather than on the day. We can move a piece to the following issue, but we can't hold the printer.\n\nDrafts go in the shared folder using the submission template.",
      priority: "IMPORTANT" as const,
      pinned: true,
      authorId: deputy.id,
      publishedAt: days(-2),
      audienceRoles: [] as Role[],
    },
    {
      title: "Photography workshop — open to everyone",
      body: "Akosua is running a photography workshop in the Art Room in two weeks.\n\nIt's aimed at people who've never shot for the Board before, but anyone is welcome. Bring a camera or just your phone.\n\nRSVP through the calendar so we know how many chairs to put out.",
      priority: "NORMAL" as const,
      pinned: false,
      authorId: design.id,
      publishedAt: days(-6),
      audienceRoles: [] as Role[],
    },
    {
      title: "Budget figures for the executive meeting",
      body: "The termly figures are now in the document library under Reports. Please read them before Thursday's executive meeting rather than during it.\n\nThe print quote came in higher than last term — we'll need to decide between a shorter run and a thinner issue.",
      priority: "NORMAL" as const,
      pinned: false,
      authorId: admin.id,
      publishedAt: days(-9),
      audienceRoles: ["EXECUTIVE", "ADMIN"] as Role[],
    },
    {
      title: "House style guide has been updated",
      body: "The style guide now covers how we handle staff titles and how to write dates. Both were being done three different ways across Issue 2.\n\nIt's in the document library under Templates & guidelines. Sub-editors, please read it properly.",
      priority: "NORMAL" as const,
      pinned: false,
      authorId: features.id,
      publishedAt: days(-16),
      audienceRoles: ["EDITOR", "EXECUTIVE", "ADMIN"] as Role[],
    },
  ];

  for (const spec of announcementSpecs) {
    const existing = await db.announcement.findFirst({
      where: { title: spec.title },
      select: { id: true },
    });
    if (existing) continue;
    await db.announcement.create({ data: spec });
  }

  console.log(`  ${announcementSpecs.length} announcements`);

  // --- Tasks --------------------------------------------------------------
  const taskSpecs = [
    {
      title: "Write the debate club feature",
      description:
        "800 words on the regional debate final. Interview at least two of the team.",
      assigneeId: writer.id,
      createdById: deputy.id,
      dueAt: days(6),
      priority: "HIGH" as const,
      status: "IN_PROGRESS" as const,
    },
    {
      title: "Shoot the inter-house athletics",
      description: "We need a strong lead image plus six or seven usable frames.",
      assigneeId: photographer.id,
      createdById: design.id,
      dueAt: days(9),
      priority: "NORMAL" as const,
      status: "TODO" as const,
    },
    {
      title: "Sub-edit the science fair copy",
      assigneeId: features.id,
      createdById: admin.id,
      dueAt: days(-3),
      priority: "HIGH" as const,
      status: "TODO" as const,
    },
    {
      title: "Type up Week 5 minutes",
      assigneeId: secretary.id,
      createdById: admin.id,
      dueAt: days(2),
      priority: "NORMAL" as const,
      status: "TODO" as const,
    },
    {
      title: "Chase the printer for a revised quote",
      assigneeId: reporter.id,
      createdById: admin.id,
      dueAt: days(-10),
      priority: "NORMAL" as const,
      status: "DONE" as const,
      completedAt: days(-11),
    },
  ];

  for (const spec of taskSpecs) {
    const existing = await db.task.findFirst({
      where: { title: spec.title, assigneeId: spec.assigneeId },
      select: { id: true },
    });
    if (existing) continue;
    await db.task.create({ data: spec });
  }

  console.log(`  ${taskSpecs.length} tasks`);

  // --- Publications -------------------------------------------------------
  const publicationSpecs = [
    {
      slug: "the-chronicle-issue-2",
      title: "The Chronicle",
      issueLabel: "Vol. 4, Issue 2",
      description:
        "Our second issue of the year: the science fair in full, a profile of the outgoing head girl, and eight pages of photography from inter-house athletics.",
      type: "MAGAZINE" as const,
      publishedAt: days(-25),
      pageCount: 32,
      featured: true,
    },
    {
      slug: "the-chronicle-issue-1",
      title: "The Chronicle",
      issueLabel: "Vol. 4, Issue 1",
      description:
        "The year's opening issue — new intake, new executives, and a look back at what the Board published last year.",
      type: "MAGAZINE" as const,
      publishedAt: days(-95),
      pageCount: 28,
      featured: false,
    },
    {
      slug: "board-briefing-march",
      title: "Board Briefing",
      issueLabel: "March",
      description:
        "A single-sheet monthly round-up of what the Board is working on.",
      type: "NEWSLETTER" as const,
      publishedAt: days(-40),
      pageCount: 2,
      featured: false,
    },
    {
      slug: "board-briefing-february",
      title: "Board Briefing",
      issueLabel: "February",
      description: "February's round-up.",
      type: "NEWSLETTER" as const,
      publishedAt: days(-70),
      pageCount: 2,
      featured: false,
    },
    {
      slug: "founders-day-special",
      title: "Founders' Day Special",
      issueLabel: "Special edition",
      description:
        "A commemorative edition marking the school's anniversary, with archive photographs and interviews with three former editors.",
      type: "SPECIAL_EDITION" as const,
      publishedAt: days(-150),
      pageCount: 40,
      featured: false,
    },
  ];

  for (const spec of publicationSpecs) {
    await db.publication.upsert({
      where: { slug: spec.slug },
      update: {},
      create: { ...spec, isPublic: true },
    });
  }

  console.log(`  ${publicationSpecs.length} publications`);

  // --- News posts ---------------------------------------------------------
  const postSpecs = [
    {
      slug: "issue-3-open-for-submissions",
      title: "Issue 3 is open for submissions",
      excerpt:
        "Pitches for our third issue of the year are open to every student, not just Board members.",
      body: "Pitches for Issue 3 are now open, and for the first time this year we're taking them from the whole school rather than only from Board members.\n\nWe're looking for reporting, opinion, photography, and illustration. If you've never written for us before, that isn't a problem — every member of the Board started somewhere, and an editor will work through your draft with you.\n\nWhat we want is straightforward: something you actually know about, or something you're willing to go and find out about. A good 400 words on a small subject beats a vague 1,200 on a large one.\n\nSend pitches to the editorial desk, or find any member of the Board at the weekly meeting. The copy deadline is in three weeks.",
      authorId: deputy.id,
      publishedAt: days(-3),
      status: "PUBLISHED" as const,
    },
    {
      slug: "board-wins-regional-media-award",
      title: "The Board wins Best School Magazine at the regional awards",
      excerpt:
        "The Chronicle took the top prize in the school magazine category, with a special mention for photography.",
      body: "The Chronicle has won Best School Magazine at this year's regional media awards, beating entries from eleven other schools.\n\nThe judges singled out Issue 2's coverage of the science fair, calling it \"reporting that took its readers seriously\". Our photography team also received a special mention.\n\nThis is the first time the Board has won in this category. Three of the people who worked on the winning issue have since left the school, and the award belongs as much to them as to the current Board.\n\nThe trophy will live in the library display case. The certificate, inevitably, will live in a folder somewhere.",
      authorId: admin.id,
      publishedAt: days(-30),
      status: "PUBLISHED" as const,
    },
    {
      slug: "meet-the-new-executives",
      title: "Meet the new executive committee",
      excerpt:
        "Five members take up executive posts for the coming year, following last term's elections.",
      body: "Following elections at the end of last term, five members have taken up executive posts on the Board.\n\nAma Boateng continues as Editor-in-Chief for a second year. Kwame Mensah moves from Features to Deputy Editor, and Efua Danso takes over as Secretary — which means she inherits the minutes, the attendance register, and the Board's institutional memory.\n\nAkosua Frimpong stays on as Layout and Design Editor, and Yaw Osei takes the Features desk.\n\nThe full committee, with what each of them is actually responsible for, is on the About page.",
      authorId: secretary.id,
      publishedAt: days(-60),
      status: "PUBLISHED" as const,
    },
    {
      slug: "photography-workshop-notes",
      title: "Notes from the photography workshop",
      excerpt: "A draft write-up of what we covered.",
      body: "Draft — to be finished after the workshop actually runs.",
      authorId: design.id,
      publishedAt: null,
      status: "DRAFT" as const,
    },
  ];

  for (const spec of postSpecs) {
    await db.post.upsert({
      where: { slug: spec.slug },
      update: {},
      create: spec,
    });
  }

  console.log(`  ${postSpecs.length} news posts`);

  // --- Achievements -------------------------------------------------------
  const achievementSpecs = [
    {
      title: "Best School Magazine — Regional Media Awards",
      description:
        "The Chronicle took the top prize in the school magazine category, with a special mention for photography.",
      achievedAt: days(-30),
      featured: true,
    },
    {
      title: "First all-student-produced issue",
      description:
        "Issue 1 of Volume 4 was written, edited, photographed, and laid out entirely by students, with no staff involvement at any stage.",
      achievedAt: days(-95),
      featured: true,
    },
    {
      title: "Board membership passes fifty",
      description:
        "The largest the Board has been since it was founded.",
      achievedAt: days(-140),
      featured: true,
    },
    {
      title: "Founders' Day special edition published",
      description: "A 40-page commemorative edition, our longest to date.",
      achievedAt: days(-150),
      featured: false,
    },
    {
      title: "Digital archive opened",
      description:
        "Every back issue the Board could find was scanned and made available online.",
      achievedAt: days(-300),
      featured: false,
    },
  ];

  for (const spec of achievementSpecs) {
    const existing = await db.achievement.findFirst({
      where: { title: spec.title },
      select: { id: true },
    });
    if (existing) continue;
    await db.achievement.create({ data: spec });
  }

  console.log(`  ${achievementSpecs.length} achievements`);

  // --- Albums -------------------------------------------------------------
  // Seeded without photo files — the media team uploads real ones. The albums
  // exist so the structure is visible from the first login.
  const albumSpecs = [
    {
      slug: "magazine-launch-issue-2",
      title: "Magazine launch — Issue 2",
      description:
        "The launch of our second issue in the School Hall, with readings from three contributors.",
      eventDate: days(-25),
      isPublic: true,
    },
    {
      slug: "inter-house-athletics",
      title: "Inter-house athletics",
      description: "A full day's shooting from the athletics meet.",
      eventDate: days(-45),
      isPublic: true,
    },
    {
      slug: "board-working-photos",
      title: "The Board at work",
      description:
        "Behind the scenes at layout weekend. Internal use — some of these are unflattering.",
      eventDate: days(-50),
      isPublic: false,
    },
  ];

  for (const spec of albumSpecs) {
    await db.album.upsert({
      where: { slug: spec.slug },
      update: {},
      create: spec,
    });
  }

  console.log(`  ${albumSpecs.length} albums`);

  // --- Inbox --------------------------------------------------------------
  const submissionSpecs = [
    {
      type: "JOIN" as const,
      status: "NEW" as const,
      name: "Nana Owusu",
      email: "nana.owusu@oseitutushs.edu.gh",
      classYear: "Form 3",
      interestArea: "Writing / Reporting",
      message:
        "I've been writing for my class newsletter for two years and I'd like to write something that more people will read. I'm most interested in reporting on sport, but I'll write whatever needs writing.",
      createdAt: days(-1),
    },
    {
      type: "JOIN" as const,
      status: "NEW" as const,
      name: "Abena Sarpong",
      email: "abena.sarpong@oseitutushs.edu.gh",
      classYear: "Form 2",
      interestArea: "Design & Layout",
      message:
        "I do a lot of illustration and I taught myself layout software over the holidays. I'd like to help with how the magazine looks.",
      createdAt: days(-4),
    },
    {
      type: "CONTACT" as const,
      status: "NEW" as const,
      name: "Mr. Adjei",
      email: "adjei@oseitutushs.edu.gh",
      subject: "Correction to the science fair piece",
      message:
        "The article in Issue 2 gives the wrong year for when the science fair started. It began in 2011, not 2013. Otherwise a good piece — please pass that on to whoever wrote it.",
      createdAt: days(-7),
    },
    {
      type: "CONTACT" as const,
      status: "READ" as const,
      name: "Grace Amponsah",
      email: "grace.amponsah@oseitutushs.edu.gh",
      subject: "Back issues",
      message:
        "Is there anywhere I can read issues from before this year? I'm doing a project on how the school has changed and the old magazines would help a lot.",
      createdAt: days(-18),
    },
  ];

  for (const spec of submissionSpecs) {
    const existing = await db.submission.findFirst({
      where: { email: spec.email, message: spec.message },
      select: { id: true },
    });
    if (existing) continue;
    await db.submission.create({ data: spec });
  }

  console.log(`  ${submissionSpecs.length} inbox items`);

  // --- Announcement read receipts ----------------------------------------
  // A partially-read state makes the unread badge and read-percentage bars
  // show something meaningful straight away.
  const allAnnouncements = await db.announcement.findMany({
    select: { id: true },
  });
  const readers = [admin, deputy, secretary, features];

  for (const a of allAnnouncements.slice(1)) {
    for (const r of readers) {
      await db.announcementRead.upsert({
        where: { announcementId_userId: { announcementId: a.id, userId: r.id } },
        update: {},
        create: { announcementId: a.id, userId: r.id },
      });
    }
  }

  // --- Audit trail --------------------------------------------------------
  const auditCount = await db.auditLog.count();
  if (auditCount === 0) {
    await db.auditLog.createMany({
      data: [
        {
          actorId: admin.id,
          actorName: admin.name,
          action: "user.create",
          entityType: "User",
          entityId: reporter.id,
          summary: `Created ${reporter.name} (${reporter.email}) as Member`,
          createdAt: days(-20),
        },
        {
          actorId: secretary.id,
          actorName: secretary.name,
          action: "document.upload",
          entityType: "Document",
          summary: 'Uploaded "Minutes — General Meeting, Week 5"',
          createdAt: days(-21),
        },
        {
          actorId: admin.id,
          actorName: admin.name,
          action: "user.update",
          entityType: "User",
          entityId: design.id,
          summary: `${design.name}: role Member → Editor`,
          createdAt: days(-60),
        },
        {
          actorId: deputy.id,
          actorName: deputy.name,
          action: "announcement.create",
          entityType: "Announcement",
          summary: 'Posted "Copy deadline for Issue 3 is next Friday"',
          createdAt: days(-2),
        },
      ],
    });
  }

  console.log("\nDone.\n");
  console.log("Sign in with any of these — the password is the same for all:");
  console.log(`  Password: ${PASSWORD}\n`);
  for (const p of PEOPLE) {
    console.log(`  ${p.email.padEnd(28)} ${p.role.padEnd(10)} ${p.position}`);
  }
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
