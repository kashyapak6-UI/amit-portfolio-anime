export type Company = {
  name: string
  role: string
  period: string
  place: string
  note: string
  kind: 'broadcast' | 'robot' | 'servers' | 'screens' | 'star' | 'remote'
  color: string
}

// Source: Amit's CV (March 2026). Dates and titles follow the CV.
export const COMPANIES: Company[] = [
  { name: 'Media Vox', role: 'Graphic Designer', period: 'Feb – May 2020', place: 'Ludhiana', note: 'Where it started: first studio desk, first client briefs.', kind: 'broadcast', color: '#ea594e' },
  { name: 'TTC Robotronics', role: 'Graphic Designer', period: 'Apr – Jun 2022', place: 'Ludhiana', note: 'Visuals for a robotics and tech training brand.', kind: 'robot', color: '#31a8ff' },
  { name: 'VPro Infotech', role: 'Graphic Designer', period: 'Jun – Dec 2022', place: 'Ludhiana', note: 'Campaign creatives for an IT services company.', kind: 'servers', color: '#77c196' },
  { name: 'Digital Handlers India', role: 'Graphic Designer', period: 'Feb – Jul 2023', place: 'Ludhiana', note: 'Agency pace: 12 to 13 social creatives a day.', kind: 'screens', color: '#a259ff' },
  { name: 'Starzlink Corporation', role: 'Creative Graphic Designer', period: 'Aug 2023 – Aug 2024', place: 'Ludhiana', note: 'Brand and social systems across a year of campaigns.', kind: 'star', color: '#ff9a00' },
  { name: 'GrizonTech', role: 'Graphic & Web UI Designer', period: 'Aug 2024 – Dec 2025', place: 'Remote', note: 'MyChamp11 app screens, website UI and dashboards.', kind: 'remote', color: '#c9a36a' },
]

export const SKILLS = [
  { title: 'Social media creatives & branding', body: '1000+ creatives for gaming, tech, real estate and marketing brands, plus logos and identity work.' },
  { title: 'Website UI', body: 'Landing pages, marketing sites and dashboards designed for real build and real conversion.' },
  { title: 'Basic app UI', body: 'Clean mobile screens and flows, including the MyChamp11 fantasy sports app.' },
  { title: 'AI images, videos & reels', body: 'AI-assisted visuals, motion and short-form reels that stay on brand.' },
]

export const TOOLS = ['Photoshop', 'Illustrator', 'Figma', 'Canva', 'AI tools']

export const CONTACT = {
  email: 'amitkashyap777999@gmail.com',
  phone: '+91 9803277171',
  phoneHref: 'tel:+919803277171',
  place: 'Ludhiana, India',
}
