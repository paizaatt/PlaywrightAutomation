import { env } from '../../config/env.config';
import { expect, test } from '../../src/fixtures/test.fixture';

test('Kiểm tra fixture bắt log', async ({ page }) => {
    await page.goto('https://google.com');
    
    // Cố tình tạo một lỗi trong console trình duyệt
    await page.evaluate(() => console.error('ĐÂY LÀ LỖI GIẢ ĐỂ TEST FIXTURE'));
    
    // Làm cho test thất bại để fixture thực hiện đính kèm log
    expect(true).toBe(false); 
  });
  