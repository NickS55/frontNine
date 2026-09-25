import { Header } from './components/Header'
import { FloatingEquipment } from './components/FloatingEquipment'

const LAST_UPDATED = 'September 25, 2026'

function Section({ id, title, children }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="font-display mb-3 text-2xl font-bold uppercase tracking-wide text-primary">
        {title}
      </h2>
      <div className="space-y-4 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <FloatingEquipment />
      <Header />

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-16">
        <div className="mb-12 text-center">
          <h1 className="font-display mb-4 text-4xl font-bold uppercase tracking-wide md:text-5xl">
            Privacy<br />
            <span className="text-primary">Policy</span>
          </h1>
          <p className="text-sm text-muted-foreground">Last updated {LAST_UPDATED}</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-8 md:p-10">
          <Section title="Who We Are">
            <p>
              All Nine Sports, LLC is a Georgia limited liability company. This policy
              covers the All Nine Sports web platform and the mobile apps we publish,
              including Caliper.
            </p>
            <p>
              Our products handle very different kinds of data, so this policy is split
              by product. The section that applies to you is the one for the product
              you&apos;re using.
            </p>
          </Section>

          <Section id="platform" title="All Nine Sports Platform">
            <p>
              The web platform is an account-based service for tracking pitching work,
              so it necessarily stores what you put into it.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">Account information.</strong>{' '}
                Sign-in is handled by Clerk, our authentication provider. That covers
                your name, email address and login credentials. We never see or store
                your password.
              </li>
              <li>
                <strong className="text-foreground">Data you upload.</strong>{' '}
                Bullpen sessions, tracking uploads and any files you import are stored
                so the platform can show them back to you and compute your metrics.
              </li>
              <li>
                <strong className="text-foreground">Support requests.</strong>{' '}
                When you use our support form we keep the name, email address and
                message you send, so we can reply and follow up.
              </li>
            </ul>
            <p>
              This data is stored in our database and file storage, both operated on our
              behalf by our hosting provider. We do not sell it, and we do not share it
              with advertisers.
            </p>
            <p>
              If you invite a coach or are invited by one, the work you share becomes
              visible to that person. That is the point of the feature, and it is the
              only way your data reaches another user.
            </p>
          </Section>

          <Section id="caliper" title="Caliper for iOS">
            <p>
              <strong className="text-foreground">
                Caliper does not collect any data about you.
              </strong>{' '}
              There is no account, no sign-in and no analytics. We receive nothing.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Your projects, images, videos and annotations are stored only on your
                device, and are never uploaded to us or to anyone else.
              </li>
              <li>
                Photos and videos you import are read from your photo library with your
                permission and copied into the app&apos;s own private storage.
              </li>
              <li>
                Datasets you export are written to a location you choose. Where they go
                from there is entirely up to you.
              </li>
            </ul>
            <p>
              Caliper makes exactly one kind of network request: when you search for or
              download a machine-learning model, it contacts Hugging Face to list and
              fetch that model&apos;s files. Those requests are anonymous and carry no
              account, identifier or information about you or your work. Hugging Face
              receives them under its own privacy policy. Models run on your device
              once downloaded; your images are never sent anywhere for processing.
            </p>
            <p>
              Deleting the app removes everything it stored, because there is no copy
              anywhere else.
            </p>
          </Section>

          <Section id="retention" title="Keeping And Deleting Data">
            <p>
              Platform data is kept while your account is open. Ask us to close your
              account and we will delete the data associated with it, except anything we
              are required to keep for legal or accounting reasons.
            </p>
            <p>
              Caliper has nothing for us to delete. Removing a project inside the app,
              or deleting the app, is the whole of it.
            </p>
          </Section>

          <Section id="children" title="Children">
            <p>
              Youth athletes use the platform, often through a coach or parent. We do not
              knowingly collect data directly from a child under 13 without that
              involvement. If you believe a child has given us information without it,
              contact us and we will remove it.
            </p>
          </Section>

          <Section id="changes" title="Changes To This Policy">
            <p>
              If this policy changes we will update the date at the top of this page.
              Material changes affecting the platform will also be sent to the email
              address on your account.
            </p>
          </Section>

          <Section id="contact" title="Contact">
            <p>
              Questions about this policy, or about data we hold, go to{' '}
              <a
                href="mailto:support@allninesports.com"
                className="text-primary hover:underline"
              >
                support@allninesports.com
              </a>
              .
            </p>
          </Section>
        </div>
      </main>
    </div>
  )
}
