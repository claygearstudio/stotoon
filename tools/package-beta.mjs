import {packageBeta} from './beta-package.mjs';
await packageBeta({siteUrl:process.env.BETA_SITE_URL||'',videoUrl:process.env.BETA_VIDEO_URL||'',credit:process.env.BETA_ART_CREDIT||'',indexable:process.env.BETA_INDEXABLE==='1'});
console.log('공개용 소개 페이지 준비 완료. 기본값은 검색 제외이며 실제 운영/검색 공개는 별도 설정입니다.');
