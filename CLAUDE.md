{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # Competitor Watch \'97 Claude Instructions (DEMO)\
\
You are building a SMALL demo web application called **Competitor Watch**.\
\
This is a portfolio/demo project for non-technical businesses in Georgia.\
The goal is to show how AI can help companies *monitor competitors* without manual checking.\
\
This is NOT a marketing analytics platform.\
Keep it simple, calm, and reliable.\
\
---\
\
## Purpose of the app\
\
Allow a user to:\
- add competitor URLs (Facebook page, website/blog, LinkedIn page)\
- automatically check these sources for updates\
- see the **latest updates in one simple dashboard**\
- receive a **weekly email summary**\
- clearly see when there are **no updates**\
\
This replaces:\
- manually checking Facebook\
- scrolling competitor websites\
- asking employees \'93did they post anything?\'94\
\
---\
\
## Target audience\
\
- Small and medium local businesses\
- Real estate developers\
- Service companies\
- Retail, education, clinics, gyms\
- Owners and managers who don\'92t want \'93automation\'94, just visibility\
\
---\
\
## Core MVP features (MUST HAVE)\
\
### 1. Competitor setup\
User can add competitors with:\
- Competitor name (text)\
- Type (dropdown: competitor / partner / inspiration)\
- URLs (any of the following, optional):\
  - Facebook page URL\
  - Website / blog URL\
  - LinkedIn page URL\
\
Each competitor may have 1\'963 URLs.\
\
---\
\
### 2. Update checking logic\
\
For each URL:\
- Check once per day (background task)\
- Detect:\
  - new post\
  - new article\
  - new update\
\
If no new content is found:\
- store a \'93no updates\'94 result for that day\
\
This behavior is important \'97 silence is also information.\
\
---\
\
### 3. Dashboard (very important)\
\
A simple list/table showing:\
- Competitor name\
- Source (Facebook / Website / LinkedIn)\
- Date of latest update\
- Short summary (1\'962 sentences MAX, in English)\
- Link to original post/article\
- Status:\
  - \'93New update\'94\
  - \'93No updates\'94\
\
No charts.\
No analytics.\
No trends.\
\
Just *what\'92s new*.\
\
---\
\
### 4. AI summarization rules\
\
When new content is detected:\
- Summarize in **1\'962 short sentences**\
- Neutral, factual tone\
- No opinions\
- No speculation\
- If content is marketing-heavy, summarize the *announcement*, not the language\
\
If content is not readable or unclear:\
- Show: \'93Update detected, but content could not be summarized.\'94\
\
---\
\
### 5. Email summary (weekly)\
\
Once per week:\
- Send an email summary with:\
  - Competitor name\
  - New updates (if any)\
  - \'93No updates this week\'94 if nothing changed\
\
Email tone:\
- Informational\
- Very short\
- No marketing language\
\
This is optional for the demo, but should be architected cleanly.\
\
---\
\
## Important constraints (DO NOT BREAK)\
\
- Do NOT promise real-time monitoring\
- Do NOT scrape aggressively\
- Do NOT bypass paywalls or logins\
- Do NOT do sentiment analysis\
- Do NOT rank competitors\
- Do NOT add dashboards or charts\
\
If something cannot be fetched reliably:\
- mark it clearly as \'93could not check today\'94\
\
Reliability > completeness.\
\
---\
\
## Technical approach (demo-friendly)\
\
- Best-effort fetching (RSS if available, simple HTML parsing otherwise)\
- Store:\
  - last checked date\
  - last known update URL\
- Avoid heavy crawling\
- Avoid headless browsers unless absolutely necessary\
\
This is a DEMO \'97 accuracy is more important than coverage.\
\
---\
\
## UX guidelines\
\
- Extremely simple UI\
- Looks like an internal monitoring tool\
- Minimal colors\
- No animations\
- Clear labels\
\
A user should understand the app in **10 seconds**.\
\
---\
\
## Definition of done\
\
The app is complete when:\
- I can add 3\'965 competitors\
- I can see their latest updates in one list\
- I can clearly see \'93no updates\'94 when applicable\
- Summaries are short and readable\
- Demo can be explained in under 90 seconds\
\
Stop once this is achieved.\
Do not add features beyond this.\
\
---\
\
## Positioning reminder\
\
This app should feel like:\
\'93Something I would keep open in a browser tab and check once a day.\'94\
\
Not a platform.\
Not a system.\
A quiet helper.\
}