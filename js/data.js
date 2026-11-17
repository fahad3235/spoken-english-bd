'use strict';
/**
 * Spoken English BD — phrase data.
 * 60 everyday phrases in 6 topics x 10. Each phrase: id, topic, en (English),
 * bn (Bangla meaning), say (Bangla-script pronunciation hint for learners).
 * Pronunciation hints are approximate guides, labelled as such in the UI.
 * No fabricated data: all phrases are standard everyday English sentences.
 */
const TOPICS = [
  { id: 'greetings', en: 'Greetings & Polite', bn: 'শুভেচ্ছা ও ভদ্রতা' },
  { id: 'market', en: 'Market & Shopping', bn: 'বাজার ও কেনাকাটা' },
  { id: 'transport', en: 'Rickshaw & Transport', bn: 'রিকশা ও যাতায়াত' },
  { id: 'classroom', en: 'Classroom & Office', bn: 'ক্লাস ও অফিস' },
  { id: 'phone', en: 'Phone Calls', bn: 'ফোনে কথা' },
  { id: 'help', en: 'Help & Emergencies', bn: 'সাহায্য ও জরুরি' },
];

const PHRASES = [
  // Greetings & Polite
  { id: 'g01', topic: 'greetings', en: 'Hello, how are you?', bn: 'হ্যালো, আপনি কেমন আছেন?', say: 'হ্যালো, হাউ আর ইউ?' },
  { id: 'g02', topic: 'greetings', en: 'Good morning!', bn: 'শুভ সকাল!', say: 'গুড মর্নিং!' },
  { id: 'g03', topic: 'greetings', en: 'Nice to meet you.', bn: 'আপনার সাথে পরিচিত হয়ে ভালো লাগলো।', say: 'নাইস টু মিট ইউ।' },
  { id: 'g04', topic: 'greetings', en: 'Thank you very much.', bn: 'আপনাকে অনেক ধন্যবাদ।', say: 'থ্যাংক ইউ ভেরি মাচ।' },
  { id: 'g05', topic: 'greetings', en: 'You are welcome.', bn: 'আপনাকে স্বাগতম।', say: 'ইউ আর ওয়েলকাম।' },
  { id: 'g06', topic: 'greetings', en: 'Excuse me, please.', bn: 'মাফ করবেন।', say: 'এক্সকিউজ মি, প্লিজ।' },
  { id: 'g07', topic: 'greetings', en: 'I am sorry.', bn: 'আমি দুঃখিত।', say: 'আই অ্যাম সরি।' },
  { id: 'g08', topic: 'greetings', en: 'Goodbye, see you tomorrow.', bn: 'বিদায়, আগামীকাল দেখা হবে।', say: 'গুডবাই, সি ইউ টুমরো।' },
  { id: 'g09', topic: 'greetings', en: 'How is your family?', bn: 'আপনার পরিবার কেমন আছে?', say: 'হাউ ইজ ইয়োর ফ্যামিলি?' },
  { id: 'g10', topic: 'greetings', en: 'Please sit down.', bn: 'দয়া করে বসুন।', say: 'প্লিজ সিট ডাউন।' },
  // Market & Shopping
  { id: 'm01', topic: 'market', en: 'How much is this?', bn: 'এটার দাম কত?', say: 'হাউ মাচ ইজ দিস?' },
  { id: 'm02', topic: 'market', en: 'Can you reduce the price a little?', bn: 'দামটা একটু কমাতে পারবেন?', say: 'ক্যান ইউ রিডিউস দ্য প্রাইস আ লিটল?' },
  { id: 'm03', topic: 'market', en: 'I want one kilogram of rice.', bn: 'আমি এক কেজি চাল চাই।', say: 'আই ওয়ান্ট ওয়ান কিলোগ্রাম অফ রাইস।' },
  { id: 'm04', topic: 'market', en: 'Do you have a bigger size?', bn: 'এর চেয়ে বড় সাইজ আছে কি?', say: 'ডু ইউ হ্যাভ আ বিগার সাইজ?' },
  { id: 'm05', topic: 'market', en: 'Please give me the bill.', bn: 'দয়া করে বিলটা দিন।', say: 'প্লিজ গিভ মি দ্য বিল।' },
  { id: 'm06', topic: 'market', en: 'I will pay in cash.', bn: 'আমি নগদে দেব।', say: 'আই উইল পে ইন ক্যাশ।' },
  { id: 'm07', topic: 'market', en: 'This is too expensive.', bn: 'এটা খুব দামি।', say: 'দিস ইজ টু এক্সপেনসিভ।' },
  { id: 'm08', topic: 'market', en: 'Can I try this on?', bn: 'আমি কি এটা পরে দেখতে পারি?', say: 'ক্যান আই ট্রাই দিস অন?' },
  { id: 'm09', topic: 'market', en: 'I am just looking, thank you.', bn: 'আমি শুধু দেখছি, ধন্যবাদ।', say: 'আই অ্যাম জাস্ট লুকিং, থ্যাংক ইউ।' },
  { id: 'm10', topic: 'market', en: 'Please pack it for me.', bn: 'দয়া করে এটা প্যাক করে দিন।', say: 'প্লিজ প্যাক ইট ফর মি।' },
  // Rickshaw & Transport
  { id: 't01', topic: 'transport', en: 'How much is the fare to Dhanmondi?', bn: 'ধানমন্ডি যেতে ভাড়া কত?', say: 'হাউ মাচ ইজ দ্য ফেয়ার টু ধানমন্ডি?' },
  { id: 't02', topic: 'transport', en: 'Please go slowly.', bn: 'দয়া করে আস্তে যান।', say: 'প্লিজ গো স্লোলি।' },
  { id: 't03', topic: 'transport', en: 'Stop here, please.', bn: 'এখানে থামুন, দয়া করে।', say: 'স্টপ হিয়ার, প্লিজ।' },
  { id: 't04', topic: 'transport', en: 'I am in a hurry.', bn: 'আমার তাড়া আছে।', say: 'আই অ্যাম ইন আ হারি।' },
  { id: 't05', topic: 'transport', en: 'Please take the main road.', bn: 'দয়া করে মূল রাস্তা দিয়ে যান।', say: 'প্লিজ টেক দ্য মেইন রোড।' },
  { id: 't06', topic: 'transport', en: 'How long will it take?', bn: 'কতক্ষণ লাগবে?', say: 'হাউ লং উইল ইট টেক?' },
  { id: 't07', topic: 'transport', en: 'Please wait for five minutes.', bn: 'দয়া করে পাঁচ মিনিট অপেক্ষা করুন।', say: 'প্লিজ ওয়েট ফর ফাইভ মিনিটস।' },
  { id: 't08', topic: 'transport', en: 'I want to go to the railway station.', bn: 'আমি রেলস্টেশনে যেতে চাই।', say: 'আই ওয়ান্ট টু গো টু দ্য রেলওয়ে স্টেশন।' },
  { id: 't09', topic: 'transport', en: 'Turn left at the next corner.', bn: 'পরের মোড়ে বামে ঘুরুন।', say: 'টার্ন লেফট অ্যাট দ্য নেক্সট কর্নার।' },
  { id: 't10', topic: 'transport', en: 'Keep the change.', bn: 'বাকি টাকাটা রাখুন।', say: 'কিপ দ্য চেঞ্জ।' },
  // Classroom & Office
  { id: 'c01', topic: 'classroom', en: 'May I come in, sir?', bn: 'স্যার, আমি কি ভেতরে আসতে পারি?', say: 'মে আই কাম ইন, স্যার?' },
  { id: 'c02', topic: 'classroom', en: 'I do not understand. Could you repeat it, please?', bn: 'আমি বুঝতে পারিনি। দয়া করে আবার বলবেন?', say: 'আই ডু নট আন্ডারস্ট্যান্ড। কুড ইউ রিপিট ইট, প্লিজ?' },
  { id: 'c03', topic: 'classroom', en: 'What is the homework for today?', bn: 'আজকের বাড়ির কাজ কী?', say: 'হোয়াট ইজ দ্য হোমওয়ার্ক ফর টুডে?' },
  { id: 'c04', topic: 'classroom', en: 'Please explain this again.', bn: 'দয়া করে এটা আবার বুঝিয়ে দিন।', say: 'প্লিজ এক্সপ্লেইন দিস অ্যাগেইন।' },
  { id: 'c05', topic: 'classroom', en: 'I have finished my work.', bn: 'আমি আমার কাজ শেষ করেছি।', say: 'আই হ্যাভ ফিনিশড মাই ওয়ার্ক।' },
  { id: 'c06', topic: 'classroom', en: 'When is the deadline?', bn: 'শেষ তারিখ কখন?', say: 'হোয়েন ইজ দ্য ডেডলাইন?' },
  { id: 'c07', topic: 'classroom', en: 'Can we discuss this tomorrow?', bn: 'আমরা কি এটা আগামীকাল আলোচনা করতে পারি?', say: 'ক্যান উই ডিসকাস দিস টুমরো?' },
  { id: 'c08', topic: 'classroom', en: 'I need your help, please.', bn: 'আমার আপনার সাহায্য দরকার।', say: 'আই নিড ইয়োর হেল্প, প্লিজ।' },
  { id: 'c09', topic: 'classroom', en: 'Let me check and tell you.', bn: 'আমাকে দেখে জানাতে দিন।', say: 'লেট মি চেক অ্যান্ড টেল ইউ।' },
  { id: 'c10', topic: 'classroom', en: 'Thank you for your time.', bn: 'আপনার সময়ের জন্য ধন্যবাদ।', say: 'থ্যাংক ইউ ফর ইয়োর টাইম।' },
  // Phone Calls
  { id: 'p01', topic: 'phone', en: 'Hello, who is speaking, please?', bn: 'হ্যালো, কে বলছেন?', say: 'হ্যালো, হু ইজ স্পিকিং, প্লিজ?' },
  { id: 'p02', topic: 'phone', en: 'Please hold the line.', bn: 'দয়া করে লাইনে থাকুন।', say: 'প্লিজ হোল্ড দ্য লাইন।' },
  { id: 'p03', topic: 'phone', en: 'Can I take a message?', bn: 'আমি কি একটি বার্তা নিতে পারি?', say: 'ক্যান আই টেক আ মেসেজ?' },
  { id: 'p04', topic: 'phone', en: 'I will call you back in ten minutes.', bn: 'আমি দশ মিনিটের মধ্যে আবার ফোন করব।', say: 'আই উইল কল ইউ ব্যাক ইন টেন মিনিটস।' },
  { id: 'p05', topic: 'phone', en: 'Sorry, the line is busy.', bn: 'দুঃখিত, লাইনটি ব্যস্ত।', say: 'সরি, দ্য লাইন ইজ বিজি।' },
  { id: 'p06', topic: 'phone', en: 'Please speak a little slowly.', bn: 'দয়া করে একটু আস্তে বলুন।', say: 'প্লিজ স্পিক আ লিটল স্লোলি।' },
  { id: 'p07', topic: 'phone', en: 'Could you send me the address by message?', bn: 'আপনি কি ঠিকানাটা মেসেজে পাঠাতে পারবেন?', say: 'কুড ইউ সেন্ড মি দ্য অ্যাড্রেস বাই মেসেজ?' },
  { id: 'p08', topic: 'phone', en: 'The network is very weak here.', bn: 'এখানে নেটওয়ার্ক খুব দুর্বল।', say: 'দ্য নেটওয়ার্ক ইজ ভেরি উইক হিয়ার।' },
  { id: 'p09', topic: 'phone', en: 'I cannot hear you clearly.', bn: 'আমি আপনাকে স্পষ্ট শুনতে পাচ্ছি না।', say: 'আই ক্যাননট হিয়ার ইউ ক্লিয়ারলি।' },
  { id: 'p10', topic: 'phone', en: 'Thank you for calling.', bn: 'ফোন করার জন্য ধন্যবাদ।', say: 'থ্যাংক ইউ ফর কলিং।' },
  // Help & Emergencies
  { id: 'h01', topic: 'help', en: 'I need help, please.', bn: 'আমার সাহায্য দরকার।', say: 'আই নিড হেল্প, প্লিজ।' },
  { id: 'h02', topic: 'help', en: 'Where is the nearest hospital?', bn: 'সবচেয়ে কাছের হাসপাতাল কোথায়?', say: 'হোয়্যার ইজ দ্য নিয়ারেস্ট হসপিটাল?' },
  { id: 'h03', topic: 'help', en: 'Please call an ambulance.', bn: 'দয়া করে একটি অ্যাম্বুলেন্স ডাকুন।', say: 'প্লিজ কল অ্যান অ্যাম্বুলেন্স।' },
  { id: 'h04', topic: 'help', en: 'I have lost my wallet.', bn: 'আমি আমার মানিব্যাগ হারিয়ে ফেলেছি।', say: 'আই হ্যাভ লস্ট মাই ওয়ালেট।' },
  { id: 'h05', topic: 'help', en: 'Can you show me the way?', bn: 'আপনি কি আমাকে পথ দেখিয়ে দিতে পারবেন?', say: 'ক্যান ইউ শো মি দ্য ওয়ে?' },
  { id: 'h06', topic: 'help', en: 'I am feeling sick.', bn: 'আমার শরীর খারাপ লাগছে।', say: 'আই অ্যাম ফিলিং সিক।' },
  { id: 'h07', topic: 'help', en: 'Where is the police station?', bn: 'থানা কোথায়?', say: 'হোয়্যার ইজ দ্য পুলিশ স্টেশন?' },
  { id: 'h08', topic: 'help', en: 'Please help me find my friend.', bn: 'দয়া করে আমার বন্ধুকে খুঁজতে সাহায্য করুন।', say: 'প্লিজ হেল্প মি ফাইন্ড মাই ফ্রেন্ড।' },
  { id: 'h09', topic: 'help', en: 'I do not feel safe here.', bn: 'আমি এখানে নিরাপদ বোধ করছি না।', say: 'আই ডু নট ফিল সেফ হিয়ার।' },
  { id: 'h10', topic: 'help', en: 'Thank you for your help.', bn: 'আপনার সাহায্যের জন্য ধন্যবাদ।', say: 'থ্যাংক ইউ ফর ইয়োর হেল্প।' },
];

const dataApi = { TOPICS, PHRASES };
if (typeof module !== 'undefined' && module.exports) module.exports = dataApi;
if (typeof window !== 'undefined') window.SpokenData = dataApi;
