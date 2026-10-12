import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('adviser downloads a classified document as a file in Chromium', async ({page}) => {
  test.skip(!process.env.PLAYWRIGHT_BASE_URL?.startsWith('http://127.0.0.1:'), 'Local Vite fixture only');
  const content='%PDF-1.4\nBrowser document download regression\n%%EOF\n';
  await page.route('**/v1/admin/**', async route => {
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/documents/open')) {
      expect(route.request().postDataJSON()).toMatchObject({path:'lead/permis.pdf',bucket:'crm-documents',download:true,file_name:'permis.pdf'});
      await route.fulfill({status:200,contentType:'application/pdf',body:content});
    }else if(url.pathname.endsWith('/document-workspace')) await route.fulfill({json:{attachments:[],unimported_attachments:[]}});
    else if(url.pathname.endsWith('/documents')) await route.fulfill({json:{documents:[{id:'doc-id',document_type:'permis_conduire',file_name:'permis.pdf',file_path:'lead/permis.pdf',bucket:'native',file_size:content.length,mime_type:'application/pdf',status:'pending',uploaded_at:'2026-10-12T08:00:00Z'}]}});
    else await route.fulfill({json:{ok:true}});
  });
  await page.goto('/tests/e2e/fixtures/native-documents.html');
  await expect(page.getByTitle('Télécharger le document')).toBeVisible();
  const downloadEvent=page.waitForEvent('download');
  await page.getByTitle('Télécharger le document').click();
  const download=await downloadEvent;
  expect(download.suggestedFilename()).toBe('permis.pdf');
  expect(await download.failure()).toBeNull();
  expect(await readFile((await download.path())!,'utf8')).toBe(content);
});
