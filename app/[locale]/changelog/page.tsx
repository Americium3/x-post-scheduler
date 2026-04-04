import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Changelog | xPilot",
  description: "Product updates and announcements for xPilot",
};

export default async function ChangelogPage({
  params,
}: {
  params: Promise<{ locale?: string }>;
}) {
  const { locale } = await params;
  const isZh = locale === "zh";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={locale === "zh" ? "/zh" : "/"}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm mb-4 inline-block"
          >
            ← {isZh ? "返回首页" : "Back to Home"}
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {isZh ? "更新日志" : "Changelog"}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isZh
              ? "产品更新与重要公告"
              : "Product updates and important announcements"}
          </p>
        </div>

        {/* Timeline */}
        <div className="space-y-8">

          {/* 2026-04 Weekly Product Update */}
          <div className="relative pl-8 pb-8 border-l-2 border-purple-500">
            <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-purple-500"></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                  {isZh ? "产品更新" : "Product Update"}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isZh ? "2026年4月4日" : "April 4, 2026"}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {isZh
                  ? "xPilot Media Studio 全面升级"
                  : "xPilot Media Studio — Major Upgrade"}
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                {isZh ? (
                  <>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      本周我们对 xPilot 进行了全面升级，带来全新的 Media Studio 工作区、后台任务系统、后期制作工具等多项重要更新。
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">全新 Media Studio 工作区</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      我们重新设计了内容创作中心，将所有创作工具整合到统一的 Media Studio 下：
                    </p>
                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1.5 mb-4">
                      <li><strong>视频生成</strong> — AI 视频生成、视频拼接、长视频任务</li>
                      <li><strong>图片生成</strong> — 多款 AI 模型，支持文生图、图生图</li>
                      <li><strong>帖子创作</strong> — 社交媒体帖子编写与调度</li>
                      <li><strong>作品展示</strong> — 社区作品浏览、发布与管理</li>
                      <li><strong>素材管理</strong> — 统一查看所有任务状态与历史素材</li>
                      <li><strong>后期制作</strong> — 文字叠加、遮罩、智能跟踪、AI 编辑</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">后台无人值守视频生成</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      提交视频生成任务后，您可以立即关闭页面。系统会在后台自动完成处理，并将结果保存到您的素材库中。
                    </p>
                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1.5 mb-4">
                      <li>每 2 分钟自动检查任务进度</li>
                      <li>完成后自动保存到 Cloudflare R2 云存储</li>
                      <li>在素材管理中查看进度条和预估时间</li>
                      <li>支持任务重试</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">后期制作工具</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      全新后期制作工具让您无需离开平台即可完善 AI 生成的视频：
                    </p>
                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1.5 mb-4">
                      <li><strong>文字叠加</strong> — 添加中文标题、字幕，支持多种字体和样式</li>
                      <li><strong>区域遮罩</strong> — 框选区域进行模糊或颜色填充</li>
                      <li><strong>SAM2 智能跟踪</strong> — 点击目标即可全视频自动跟踪，支持内容替换</li>
                      <li><strong>AI 智能编辑</strong> — 用自然语言描述修改需求（由 Wan 2.7 VideoEdit 驱动）</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">多语言支持</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      xPilot 现已支持五种语言：English、中文、Español、日本語、한국어。您可以在设置页面或左下角语言切换器中更改。
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">其他改进</h3>
                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1.5 mb-4">
                      <li>视频生成成本降低 — 费率乘数从 5x 调整为 2x</li>
                      <li>BytePluses API 集成 — Seedance 1.5 Pro 优先使用 BytePluses 通道</li>
                      <li>侧边栏导航优化 — 更清晰的层级结构与活跃状态指示</li>
                      <li>作品详情页两栏布局 — 视频预览 + 参数信息并排显示</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      This week we shipped a major upgrade to xPilot, including a redesigned Media Studio workspace, background task processing, post-production tools, and more.
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">New Media Studio Workspace</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      All creative tools are now organized under a unified Media Studio hub:
                    </p>
                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1.5 mb-4">
                      <li><strong>Video</strong> — AI video generation, stitching, and long-form video jobs</li>
                      <li><strong>Images</strong> — Multiple AI models for text-to-image and image-to-image</li>
                      <li><strong>Posts</strong> — Compose and schedule social media posts</li>
                      <li><strong>Gallery</strong> — Browse community works, publish and manage your creations</li>
                      <li><strong>Materials</strong> — Unified view of all task statuses and generated assets</li>
                      <li><strong>Post Production</strong> — Text overlay, masking, smart tracking, and AI editing</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">Background Video Processing</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      Submit a video generation task and close the page — the system handles everything automatically.
                    </p>
                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1.5 mb-4">
                      <li>Tasks are polled every 2 minutes automatically</li>
                      <li>Completed videos are saved to Cloudflare R2 cloud storage</li>
                      <li>Track progress with live progress bars and time estimates</li>
                      <li>Retry failed tasks with one click</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">Post-Production Tools</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      New post-production tools let you refine AI-generated videos without leaving the platform:
                    </p>
                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1.5 mb-4">
                      <li><strong>Text Overlay</strong> — Add titles and subtitles with Chinese font support</li>
                      <li><strong>Area Masking</strong> — Select regions to blur or fill with solid color</li>
                      <li><strong>SAM2 Smart Tracking</strong> — Click to track objects across all frames, with content replacement</li>
                      <li><strong>AI Smart Edit</strong> — Describe changes in natural language (powered by Wan 2.7 VideoEdit)</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">Multi-Language Support</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      xPilot now supports five languages: English, Chinese, Spanish, Japanese, and Korean. Switch in Settings or via the language selector.
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">Other Improvements</h3>
                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1.5 mb-4">
                      <li>Video generation costs reduced — pricing multiplier lowered from 5x to 2x</li>
                      <li>BytePluses API integration — Seedance 1.5 Pro now routes through BytePluses with Wavespeed fallback</li>
                      <li>Sidebar navigation redesigned with clearer hierarchy and active state indicators</li>
                      <li>Gallery detail page now uses a two-column layout for better readability</li>
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 2026-04 Storage Migration & Data Loss Notice */}
          <div className="relative pl-8 pb-8 border-l-2 border-red-500">
            <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-red-500"></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300">
                  {isZh ? "重要公告" : "Important Notice"}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isZh ? "2026年4月4日" : "April 4, 2026"}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {isZh
                  ? "存储迁移公告 & 历史素材丢失说明"
                  : "Storage Migration Notice & Historical Data Loss"}
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                {isZh ? (
                  <>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">发生了什么？</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      我们发现在 2026 年 2 月 21 日至 3 月 28 日期间生成的部分图片和视频素材无法正常访问。
                      经过调查，问题原因如下：
                    </p>
                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                      <li>平台此前使用 Vercel Blob 作为文件存储服务，但由于 Hobby 计划的存储限制（500MB），导致部分文件上传失败</li>
                      <li>上传失败后，系统回退保存了 AI 模型提供商的临时 CDN 链接（有效期约 2 周）</li>
                      <li>这些临时链接过期后，相关素材便无法再访问</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">我们做了什么？</h3>
                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                      <li><strong>存储迁移至 Cloudflare R2</strong> — 我们已将文件存储从 Vercel Blob 完整迁移至 Cloudflare R2。R2 提供 10GB 免费存储空间，且无出站流量费用，彻底解决了存储容量不足的问题</li>
                      <li><strong>后台任务处理机制</strong> — 新增了后台任务系统，所有生成的视频和图片会立即从 AI 提供商下载并永久保存至我们自有的 R2 存储空间，不再依赖临时链接</li>
                      <li><strong>清理了无法访问的历史记录</strong> — 已移除 63 条因链接过期而无法访问的素材记录，避免在素材管理中显示损坏内容</li>
                      <li><strong>防删除保护</strong> — 输入文件清理机制现在会检查是否被素材库引用，确保不会误删仍在使用的文件</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">补偿措施</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      对于此次数据丢失给您造成的不便，我们深感歉意。为表示诚意，我们将为<strong>每位受影响的用户赠送 $10 平台点数</strong>，
                      可用于视频生成、图片生成等所有 AI 服务。点数将在近日自动发放至您的账户。
                    </p>

                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                      <p className="text-green-800 dark:text-green-300 font-medium">
                        保障承诺：迁移至 R2 后，您的所有新素材都将安全存储在我们自有的云存储空间中，不会再出现类似的数据丢失问题。
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">What Happened?</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      We discovered that some images and videos generated between February 21 and March 28, 2026 are no longer accessible.
                      After investigation, the root cause was identified:
                    </p>
                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                      <li>The platform previously used Vercel Blob for file storage, but the Hobby plan&apos;s 500MB storage limit caused some uploads to fail</li>
                      <li>When uploads failed, the system fell back to saving temporary CDN URLs from AI model providers (valid for ~2 weeks)</li>
                      <li>Once these temporary links expired, the associated media became inaccessible</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">What We Did</h3>
                    <ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-2 mb-4">
                      <li><strong>Migrated to Cloudflare R2</strong> — We&apos;ve fully migrated file storage from Vercel Blob to Cloudflare R2, which provides 10GB free storage with zero egress fees</li>
                      <li><strong>Background task processing</strong> — All generated videos and images are now immediately downloaded from AI providers and permanently saved to our own R2 storage</li>
                      <li><strong>Cleaned up broken records</strong> — Removed 63 gallery entries with expired URLs to prevent broken content from appearing in your materials</li>
                      <li><strong>Delete protection</strong> — Input file cleanup now checks for gallery references before deleting, preventing accidental removal of files still in use</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mt-6 mb-2">Compensation</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      We sincerely apologize for the inconvenience caused by this data loss. As a gesture of goodwill,
                      we are crediting <strong>$10 in platform credits to every affected user</strong>, usable for video generation,
                      image generation, and all AI services. Credits will be automatically added to your account shortly.
                    </p>

                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                      <p className="text-green-800 dark:text-green-300 font-medium">
                        Our commitment: After migrating to R2, all your new media is securely stored in our own cloud storage. This type of data loss will not happen again.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 2026-03 Free AI Models */}
          <div className="relative pl-8 pb-8 border-l-2 border-blue-500">
            <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-500"></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                  {isZh ? "新功能" : "New Feature"}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isZh ? "2026年3月25日" : "March 25, 2026"}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {isZh
                  ? "免费 AI 模型正式上线!"
                  : "Free AI Models Now Available!"}
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                {isZh ? (
                  <>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      我们很高兴地宣布，xPilot 现已集成多款<strong>完全免费</strong>的顶级 AI 模型，覆盖文本创作和图片生成两大场景。零成本，无限创作！
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      免费文本模型
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li><strong>Meta Llama 3.3 70B</strong> — Meta 最新开源大模型，全能型选手</li>
                      <li><strong>DeepSeek V3</strong> — 深度求索，强推理能力</li>
                      <li><strong>Google Gemma 3 27B</strong> — Google 开源模型，131K 超长上下文</li>
                      <li><strong>NVIDIA Nemotron 3 Super</strong> — 543B 参数，262K 上下文</li>
                      <li><strong>Mistral Small 3.1 24B</strong> — Mistral AI 出品，128K 上下文</li>
                      <li><strong>OpenAI GPT-OSS 120B</strong> — OpenAI 开源 120B 模型</li>
                      <li><strong>Qwen3 Coder 480B</strong> — 通义千问超大 MoE 模型</li>
                      <li><strong>Nous Hermes 3 405B</strong> — 最大免费模型</li>
                    </ul>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      免费图片生成模型
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li><strong>FLUX.2 Pro / Max / Flex / Klein</strong> — Black Forest Labs 出品，业界领先的图片生成模型</li>
                      <li><strong>Seedream 4.5</strong> — ByteDance 字节跳动出品，原生中英双语支持</li>
                    </ul>
                    <p className="text-gray-700 dark:text-gray-300">
                      所有免费模型均可在工具箱中直接使用，无需消耗积分。前往<strong>工具箱</strong>立即体验！
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      We're excited to announce that xPilot now includes multiple <strong>completely free</strong> top-tier AI models for both text generation and image creation. Zero cost, unlimited creativity!
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      Free Text Models
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li><strong>Meta Llama 3.3 70B</strong> — Meta&apos;s latest open-source model, strong all-rounder</li>
                      <li><strong>DeepSeek V3</strong> — Powerful reasoning capabilities</li>
                      <li><strong>Google Gemma 3 27B</strong> — 131K context window</li>
                      <li><strong>NVIDIA Nemotron 3 Super</strong> — 543B parameters, 262K context</li>
                      <li><strong>Mistral Small 3.1 24B</strong> — By Mistral AI, 128K context</li>
                      <li><strong>OpenAI GPT-OSS 120B</strong> — OpenAI&apos;s open-source 120B model</li>
                      <li><strong>Qwen3 Coder 480B</strong> — Massive MoE model by Alibaba</li>
                      <li><strong>Nous Hermes 3 405B</strong> — Largest free model available</li>
                    </ul>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      Free Image Generation Models
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li><strong>FLUX.2 Pro / Max / Flex / Klein</strong> — By Black Forest Labs, industry-leading image generation</li>
                      <li><strong>Seedream 4.5</strong> — By ByteDance, native Chinese &amp; English support</li>
                    </ul>
                    <p className="text-gray-700 dark:text-gray-300">
                      All free models are available directly in the Toolbox with no credit cost. Head to the <strong>Toolbox</strong> to try them now!
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 2026-03 Partnership with Numix */}
          <div className="relative pl-8 pb-8 border-l-2 border-blue-500">
            <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-500"></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                  {isZh ? "合作伙伴" : "Partnership"}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isZh ? "2026年3月" : "March 2026"}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {isZh
                  ? "xPilot 与 Numix 达成战略合作"
                  : "xPilot Partners with Numix"}
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                {isZh ? (
                  <>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      我们很高兴地宣布，xPilot 已与税务科技公司{" "}
                      <a
                        href="https://www.numix.co/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Numix
                      </a>{" "}
                      达成战略合作！Numix 专注于为企业提供自动化税务优惠、全栈会计和 CFO 服务。
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      合作亮点
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>
                        <strong>AI + 财税</strong> — 结合 xPilot 的 AI 营销能力与 Numix 的智能财税方案，为创业者和中小企业提供一站式增长支持
                      </li>
                      <li>
                        <strong>内容驱动获客</strong> — xPilot 帮助 Numix 用户通过 AI 生成的社媒内容提升品牌曝光
                      </li>
                      <li>
                        <strong>税务优惠自动化</strong> — Numix 帮助 xPilot 用户发现和申请税务优惠，降低运营成本
                      </li>
                    </ul>
                    <p className="text-gray-700 dark:text-gray-300">
                      这次合作标志着 xPilot 在构建创业者生态系统方面迈出的重要一步。期待与 Numix 一起，为更多企业赋能！
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      We're excited to announce that xPilot has partnered with{" "}
                      <a
                        href="https://www.numix.co/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Numix
                      </a>
                      , a tax technology company specializing in automated tax credits, full-stack accounting, and CFO services for businesses.
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      Partnership Highlights
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>
                        <strong>AI + FinTech</strong> — Combining xPilot's AI marketing capabilities with Numix's intelligent tax solutions to provide all-in-one growth support for entrepreneurs and SMBs
                      </li>
                      <li>
                        <strong>Content-Driven Growth</strong> — xPilot helps Numix users boost brand visibility through AI-generated social media content
                      </li>
                      <li>
                        <strong>Automated Tax Credits</strong> — Numix helps xPilot users discover and claim tax credits to reduce operating costs
                      </li>
                    </ul>
                    <p className="text-gray-700 dark:text-gray-300">
                      This partnership marks an important step in building an ecosystem for entrepreneurs. We look forward to empowering more businesses together with Numix!
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 2026-03 Scheduling change */}
          <div className="relative pl-8 pb-8 border-l-2 border-blue-500">
            <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-500"></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                  {isZh ? "服务调整" : "Service Update"}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isZh ? "2026年3月" : "March 2026"}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {isZh
                  ? "定时发布调整为每日更新"
                  : "Scheduled Publishing Now Runs Daily"}
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                {isZh ? (
                  <>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      由于基础设施资源限制，我们对定时任务系统进行了调整。
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      有什么变化？
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>
                        <strong>之前：</strong>定时发布任务每分钟检查一次，帖子会在设定的精确时间发布
                      </li>
                      <li>
                        <strong>现在：</strong>所有定时任务合并为每日一次（UTC 01:00），统一处理当日的发布、内容生成和传媒行业动态
                      </li>
                    </ul>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      对您的影响
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      定时发布的帖子将在每日 UTC 01:00（北京时间 09:00）统一处理，而非在您设定的精确时间发布。如果您安排了多个不同时间的帖子，它们将在此时间窗口内集中发布。
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      为什么调整？
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      为了在有限的基础设施资源内保持服务稳定运行，我们将多个定时触发器合并为单一的每日任务。这确保了包括内容生成和传媒动态在内的所有功能都能可靠执行。
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      Due to infrastructure resource limits, we have consolidated our scheduled task system.
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      What Changed?
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>
                        <strong>Before:</strong> Scheduled posts were checked every minute and published at their exact scheduled time
                      </li>
                      <li>
                        <strong>Now:</strong> All scheduled tasks run once daily at 01:00 UTC, handling post publishing, content generation, and media industry news together
                      </li>
                    </ul>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      How This Affects You
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      Scheduled posts will be processed during the daily 01:00 UTC window rather than at their exact scheduled time. If you have multiple posts scheduled for different times of the day, they will be published together during this window.
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      Why This Change?
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      To keep the service running reliably within our infrastructure resource limits, we consolidated multiple cron triggers into a single daily job. This ensures all features — including content generation and media industry news — continue to work dependably.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 2026-02 February Feature Updates */}
          <div className="relative pl-8 pb-8 border-l-2 border-blue-500">
            <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-500"></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                  {isZh ? "功能更新" : "Feature Updates"}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isZh ? "2026年2月" : "February 2026"}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {isZh
                  ? "2 月功能更新总结"
                  : "February Feature Update Roundup"}
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                {isZh ? (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-3">
                      发帖与调度
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>帖子创建、编辑与定时发布</li>
                      <li>帖子支持多张图片</li>
                      <li>多账号管理 — 支持连接和切换多个 X 账号</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      AI 工具箱
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>AI 图片生成</li>
                      <li>AI 视频生成，视频处理流程优化</li>
                      <li>AI 背景音乐生成</li>
                      <li>文字转语音（TTS）预览</li>
                      <li>AI 内容优化与重试机制</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      积分与会员
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>积分余额系统与用量追踪</li>
                      <li>会员等级与权限体系</li>
                      <li>积分定价与计费</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      数据分析
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>社交媒体数据分析面板</li>
                      <li>Dashboard 数据可视化图表</li>
                      <li>站点访问分析</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      新闻资讯
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>媒体新闻聚合模块</li>
                      <li>RSS 文章自动翻译</li>
                      <li>每日内容自动更新</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      国际化与体验
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>中英文多语言支持</li>
                      <li>首页改版</li>
                      <li>管理后台</li>
                      <li>使用文档中心</li>
                      <li>法律文档（隐私政策、服务条款）</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-3">
                      Posting & Scheduling
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>Create, edit, and schedule posts</li>
                      <li>Multi-image support for posts</li>
                      <li>Multi-account management — connect and switch between multiple X accounts</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      AI Toolbox
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>AI image generation</li>
                      <li>AI video generation with optimized processing pipeline</li>
                      <li>AI background music generation</li>
                      <li>Text-to-speech (TTS) preview</li>
                      <li>AI content optimization with retry mechanism</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      Credits & Membership
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>Credit balance system with usage tracking</li>
                      <li>Membership tiers and permissions</li>
                      <li>Credit pricing and billing</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      Analytics
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>Social media analytics dashboard</li>
                      <li>Dashboard data visualization charts</li>
                      <li>Site traffic analytics</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      News Feed
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>Media news aggregation module</li>
                      <li>Automatic RSS article translation</li>
                      <li>Daily content auto-refresh</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      Internationalization & Experience
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>Chinese/English multilingual support</li>
                      <li>Homepage redesign</li>
                      <li>Admin dashboard</li>
                      <li>Documentation center</li>
                      <li>Legal documents (Privacy Policy, Terms of Service)</li>
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 2026-02 Rebranding */}
          <div className="relative pl-8 pb-8 border-l-2 border-blue-500">
            <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-500"></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                  {isZh ? "品牌升级" : "Rebranding"}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {isZh ? "2026年2月" : "February 2026"}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {isZh
                  ? "X Post Scheduler 正式更名为 xPilot (X 推创)"
                  : "X Post Scheduler Rebrands to xPilot"}
              </h2>
              <div className="prose dark:prose-invert max-w-none">
                {isZh ? (
                  <>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      我们很高兴地宣布，<strong>X Post Scheduler</strong>{" "}
                      正式更名为{" "}
                      <strong className="text-blue-600 dark:text-blue-400">
                        xPilot
                      </strong>
                      （中文：
                      <strong className="text-blue-600 dark:text-blue-400">
                        X 推创
                      </strong>
                      ）！
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      为什么更名？
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      随着产品的不断发展，我们已经从单纯的"发帖调度工具"成长为一个全方位的{" "}
                      <strong>社媒营销飞行副驾驶 AI</strong>。xPilot
                      更好地体现了我们的产品定位：
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>
                        <strong>AI 驱动的内容创作</strong> -
                        文本、图片、视频全覆盖
                      </li>
                      <li>
                        <strong>智能调度系统</strong> - 自动化发布，解放双手
                      </li>
                      <li>
                        <strong>知识库引擎</strong> - 品牌化内容生成
                      </li>
                      <li>
                        <strong>跨平台分析</strong> - X 曝光量 +
                        站点流量统一监控
                      </li>
                      <li>
                        <strong>多账号管理</strong> - 一处管理所有品牌账号
                      </li>
                    </ul>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      产品功能不变
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      这次更名只是品牌升级，所有现有功能和您的账户数据完全不受影响。您可以继续使用所有服务，无需任何操作。
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      新品牌标识
                    </h3>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                          xPilot
                        </p>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-1">
                          Your Social Marketing Copilot AI
                        </p>
                        <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mt-4">
                          X 推创
                        </p>
                        <p className="text-base text-gray-600 dark:text-gray-400">
                          你的社媒营销飞行副驾驶 AI
                        </p>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      特别鸣谢
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      感谢{" "}
                      <a
                        href="https://www.yeoso.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        伊索科技（Yeoso）
                      </a>{" "}
                      提供的技术支持，助力我们完成产品升级！
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      感谢您一直以来的支持！让我们一起用 xPilot
                      开启社媒营销的新篇章。🚀
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      We're excited to announce that{" "}
                      <strong>X Post Scheduler</strong> is now officially{" "}
                      <strong className="text-blue-600 dark:text-blue-400">
                        xPilot
                      </strong>{" "}
                      (Chinese:{" "}
                      <strong className="text-blue-600 dark:text-blue-400">
                        X 推创
                      </strong>
                      )!
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      Why the Rebrand?
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      As our product has evolved, we've grown from a simple
                      "post scheduler" into a comprehensive{" "}
                      <strong>social marketing copilot AI</strong>. xPilot
                      better reflects our product vision:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mb-4">
                      <li>
                        <strong>AI-Powered Content Creation</strong> - Text,
                        images, and videos
                      </li>
                      <li>
                        <strong>Smart Scheduling</strong> - Automated
                        publishing, hands-free
                      </li>
                      <li>
                        <strong>Knowledge Base Engine</strong> - Brand-aligned
                        content generation
                      </li>
                      <li>
                        <strong>Cross-Platform Analytics</strong> - X
                        impressions + site traffic in one dashboard
                      </li>
                      <li>
                        <strong>Multi-Account Management</strong> - Manage all
                        your brand accounts in one place
                      </li>
                    </ul>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      Everything Stays the Same
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      This is purely a branding update. All existing features
                      and your account data remain completely unchanged. You can
                      continue using all services without any action required.
                    </p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      New Brand Identity
                    </h3>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                          xPilot
                        </p>
                        <p className="text-lg text-gray-600 dark:text-gray-400 mb-1">
                          Your Social Marketing Copilot AI
                        </p>
                        <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mt-4">
                          X 推创
                        </p>
                        <p className="text-base text-gray-600 dark:text-gray-400">
                          你的社媒营销飞行副驾驶 AI
                        </p>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      Special Thanks
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      Special thanks to{" "}
                      <a
                        href="https://www.yeoso.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                      >
                        Yeoso Technology (伊索科技)
                      </a>{" "}
                      for their technical support in making this upgrade
                      possible!
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      Thank you for your continued support! Let's embark on a
                      new chapter of social media marketing with xPilot. 🚀
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Placeholder for future updates */}
          <div className="relative pl-8 pb-8 border-l-2 border-gray-300 dark:border-gray-700">
            <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-700"></div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 opacity-60">
              <p className="text-gray-500 dark:text-gray-400 text-center italic">
                {isZh ? "更多更新敬请期待..." : "More updates coming soon..."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
