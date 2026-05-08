const { chromium } = require('playwright');
require('dotenv').config();

const SITE_URL = process.env.SITE_URL || 'https://green-office.uk/';
const USER_ID = process.env.USER_ID;
const USER_PASSWORD = process.env.USER_PASSWORD;

async function runBot(mode = 'comment') {
  console.log(`Starting bot in ${mode} mode...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    // 1. Login
    console.log('Logging in...');
    await page.goto(`${SITE_URL}login`);
    await page.fill('input[placeholder*="아이디"]', USER_ID);
    await page.fill('input[placeholder*="비밀번호"]', USER_PASSWORD);
    await page.click('button:has-text("로그인")');
    
    // Wait for login to complete (redirect to home or profile)
    await page.waitForTimeout(3000); 

    if (mode === 'comment') {
      await handleComment(page);
    } else if (mode === 'post') {
      await handlePost(page);
    }

  } catch (error) {
    console.error('Error during bot execution:', error);
    // Take screenshot on failure
    await page.screenshot({ path: `error-${Date.now()}.png` });
  } finally {
    await browser.close();
  }
}

async function handleComment(page) {
  console.log('Navigating to home to find a post...');
  await page.goto(SITE_URL);
  await page.waitForTimeout(2000);

  // Find all post links. Based on the grid structure seen earlier.
  // We look for links that look like they lead to posts.
  const postLinks = await page.$$eval('a[href*="/posts/"]', links => links.map(a => a.href));
  
  if (postLinks.length === 0) {
    console.log('No posts found. Looking for alternative selectors...');
    // Fallback: search for any link inside the main grid
    const altLinks = await page.$$eval('main a', links => links.map(a => a.href).filter(href => href.includes('/posts/')));
    if (altLinks.length > 0) postLinks.push(...altLinks);
  }

  if (postLinks.length === 0) {
    throw new Error('Could not find any posts to comment on.');
  }

  const randomPost = postLinks[Math.floor(Math.random() * postLinks.length)];
  console.log(`Selecting random post: ${randomPost}`);
  await page.goto(randomPost);
  await page.waitForTimeout(2000);

  const messages = ["감사합니다.", "멋집니다."];
  const message = messages[Math.floor(Math.random() * messages.length)];

  console.log(`Leaving comment: ${message}`);
  
  // Look for comment textarea
  const commentArea = await page.waitForSelector('textarea', { timeout: 5000 });
  await commentArea.fill(message);
  
  // Click submit button (usually contains "등록" or is a button near the textarea)
  const submitBtn = await page.locator('button:has-text("등록"), button:has-text("댓글")').first();
  await submitBtn.click();
  
  await page.waitForTimeout(2000);
  console.log('Comment submitted successfully.');
}

async function handlePost(page) {
  console.log('Creating a new post about Orange Jasmine...');
  
  // Find "Write" button. Often labeled "글쓰기" or an icon.
  // Let's try to find a link to /posts/new or a button with text "글쓰기"
  await page.goto(SITE_URL);
  const writeBtn = await page.locator('a[href*="/write"], button:has-text("글쓰기")').first();
  
  if (await writeBtn.isVisible()) {
    await writeBtn.click();
  } else {
    // Try direct navigation if possible
    await page.goto(`${SITE_URL}write`);
  }
  
  await page.waitForTimeout(2000);

  const title = "오렌지 자스민 키우기: 향기로운 반려식물을 위한 꿀팁 🌿";
  const content = `
오렌지 자스민(Orange Jasmine)은 향기로운 하얀 꽃과 반짝이는 잎이 매력적인 식물입니다. 
성공적으로 키우기 위한 핵심 정보를 공유합니다!

1. 햇빛: 양지~반양지를 좋아합니다. 하루 4-6시간 이상의 밝은 빛이 필요해요.
2. 물주기: 겉흙이 말랐을 때 흠뻑 주세요. (주 1-2회 정도)
3. 온도: 15~25도 사이가 적당하며, 추위에 약하니 겨울에는 실내로 옮겨주세요.
4. 팁: 꽃이 진 후 가지치기를 해주면 더 풍성하게 자란답니다.

달콤한 향기가 가득한 오렌지 자스민과 함께 힐링하세요! #식물키우기 #오렌지자스민 #가드닝
  `.trim();

  console.log('Filling post content...');
  await page.fill('input[placeholder*="제목"]', title);
  
  // Content might be a textarea or a contenteditable div (common in Next.js/React editors)
  const contentSelector = 'textarea, div[contenteditable="true"]';
  await page.fill(contentSelector, content);
  
  console.log('Submitting post...');
  const submitBtn = await page.locator('button:has-text("등록"), button:has-text("작성"), button:has-text("완료")').first();
  await submitBtn.click();
  
  await page.waitForTimeout(3000);
  console.log('Post created successfully.');
}

module.exports = { runBot };
