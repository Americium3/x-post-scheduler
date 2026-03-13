const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    // 先查看有多少条记录
    const countBefore = await prisma.mediaIndustryReport.count({ where: { period: 'daily' } });
    console.log('Before delete - MediaIndustryReport daily count:', countBefore);
    
    const countBeforeX = await prisma.mediaXTweetReport.count({ where: { period: 'daily' } });
    console.log('Before delete - MediaXTweetReport daily count:', countBeforeX);
    
    // 测试删除语句
    const result1 = await prisma.$executeRaw`DELETE FROM "MediaIndustryReport" WHERE "period" = 'daily'`;
    console.log('MediaIndustryReport delete result:', result1);
    
    const result2 = await prisma.$executeRaw`DELETE FROM "MediaXTweetReport" WHERE "period" = 'daily'`;
    console.log('MediaXTweetReport delete result:', result2);
    
    // 再次查看
    const countAfter = await prisma.mediaIndustryReport.count({ where: { period: 'daily' } });
    console.log('After delete - MediaIndustryReport daily count:', countAfter);
    
    const countAfterX = await prisma.mediaXTweetReport.count({ where: { period: 'daily' } });
    console.log('After delete - MediaXTweetReport daily count:', countAfterX);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
