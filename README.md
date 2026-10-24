# TAPX Care — Doctor profile

A standalone doctor business profile webpage built from the supplied Doctor_Profile_UI design. The profile opens automatically when the website loads. No opening card, curtain, sign-in or installation is required.

## Run locally

Requires Node.js 20 or newer. There are no packages to install.

```sh
npm run dev
```

Open **http://localhost:5174**. The `PORT` environment variable can change the port.

## Included

- Teal-and-white profile for **Dr. N. Fernando**, with clinic contact actions and contact-card download.
- Profile, Clinics and Forum sections with smooth horizontal swipes, touch and mouse support, native vertical scrolling, and keyboard navigation.
- Clinic details, consulting times, languages, and appointment options.
- Appointment form with patient name, phone, email, clinic, preferred date, appointment type, visit reason and optional referral selection.
- Request review, downloadable appointment details, and email draft creation after real clinic contact details are configured.
- Doctors’ Forum with search, Practice/Learning/Career filters, local discussions and replies.
- Accessible form labels, visible focus, and reduced-motion support.

## Personalise

Edit **`dist/profile-config.js`**. Replace the sample name and clinic details, add the clinic's real phone, WhatsApp, email and website, then set `isDemo` to `false`. Phone numbers should include the country code; website links require an `https://` or `http://` prefix.

The starting profile and **clinic@example.com** are sample details from the design. Unconfigured contact buttons show an explanation.

## Appointment and forum behaviour

Appointment requests are prepared locally and are never labelled as sent or booked. The clinic must receive the request and confirm the time. In the configured profile, visitors can open an email draft to send it themselves. Request details stay in memory and disappear on page reload; they are not written to localStorage.

Referral selection only records a filename for the current request. Files are never uploaded. Attach the referral separately when sending an email.

The forum is a working preview. Example discussions are identified in their detail view. New posts and replies stay in the current browser and are not shared with other visitors. Shared discussions require an authentication service and database. No appointment or referral data is stored with forum posts.

## Check and deploy

```sh
npm run check
```

The GitHub Actions workflow checks JavaScript and publishes only **`dist/`** to GitHub Pages on pushes to `main`. The repository's Pages publishing source must be **GitHub Actions**. Hash-based navigation and relative assets work under the repository's Pages path without rewrites or a build step.

The doctor profile has its own repository and deployment. It is independent of the lawyer website.

DOM interaction checks cover initial loading, navigation, contact export, appointment validation and review, draft retention, search, forum categories, local discussions/replies, HTML escaping, swipe navigation and route recovery. Browser visual QA was unavailable in this environment; review the design and gesture feel on a phone before using real clinic details.
