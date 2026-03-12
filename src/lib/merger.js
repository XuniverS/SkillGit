'use strict';

/**
 * Merger 模块：负责调用 OpenClaw AI 进行 skill 冲突合并
 */

const fetch = require('node-fetch');

// ────────────────────────────────────────────────────────────
//  合并 Prompt 构造
// ────────────────────────────────────────────────────────────

/**
 * 构造发给 AI 的合并 prompt
 *
 * @param {object} params
 * @param {string} params.skillName        - skill 名称
 * @param {string} params.fileName         - 具体冲突的文件名（通常是 SKILL.md）
 * @param {string} params.localContent     - 本地版本内容
 * @param {string} params.remoteContent    - 远端版本内容
 * @param {string} params.baseContent      - 公共祖先内容（可能为空）
 * @param {string} params.localAuthor      - 本地提交者
 * @param {string} params.remoteAuthor     - 远端提交者
 * @param {string} params.localMessage     - 本地 commit 消息
 * @param {string} params.remoteMessage    - 远端 commit 消息
 */
function buildMergePrompt(params) {
  const {
    skillName,
    fileName,
    localContent,
    remoteContent,
    baseContent,
    localAuthor,
    remoteAuthor,
    localMessage,
    remoteMessage,
  } = params;

  const baseSection = baseContent
    ? `
## 公共祖先版本（Base）
\`\`\`
${baseContent}
\`\`\`
`
    : `
## 公共祖先版本（Base）
（无公共祖先，两个版本均为独立创建）
`;

  return `你是一位专业的 AI Skill 代码合并助手。现在有两位开发者分别对同一个 OpenClaw Skill 进行了修改，产生了冲突，需要你来智能合并。

## 冲突文件信息

- **Skill 名称**：${skillName}
- **文件名**：${fileName}
- **本地提交者**：${localAuthor || '未知'}（提交信息：${localMessage || '无'}）
- **远端提交者**：${remoteAuthor || '未知'}（提交信息：${remoteMessage || '无'}）

---
${baseSection}

## 本地版本（Local - ${localAuthor || '本地'}）

\`\`\`
${localContent}
\`\`\`

## 远端版本（Remote - ${remoteAuthor || '远端'}）

\`\`\`
${remoteContent}
\`\`\`

---

## 合并任务要求

请你仔细阅读以上三个版本（公共祖先、本地修改、远端修改），然后执行智能三路合并，产出最终合并结果。

**合并原则**（按优先级排序）：

1. **保留双方意图**：如果两个版本各自在不同区域做了修改，应将两者的修改都保留。
2. **语义一致性**：对于 SKILL.md 等 Markdown 内容，要保证合并后的文档结构清晰、逻辑连贯、无重复或矛盾的说明。
3. **功能完整性**：对于代码片段、命令示例、配置项，应尽量保留两个版本中的有效信息，不遗漏任何一方添加的功能描述。
4. **去除冗余**：如果两个版本添加了相同语义但表述不同的内容，选择表述更清晰的一方，或合并为一条。
5. **格式规范**：最终结果必须符合 OpenClaw Skill 文档规范，保持 Markdown 格式整洁。

**输出要求**：
- 只输出合并后的文件内容，不要有任何额外说明、注释或 markdown 代码块标记
- 输出必须是可以直接写入文件的纯文本内容
- 不要输出 \`\`\` 代码块包裹符
- 如果你认为某处存在语义冲突无法自动解决，在对应位置添加注释：<!-- MERGE_CONFLICT: 请人工审查此处 -->

现在请开始合并，直接输出合并结果：`;
}

// ────────────────────────────────────────────────────────────
//  AI 调用
// ────────────────────────────────────────────────────────────

/**
 * 调用 OpenAI 兼容接口进行合并
 */
async function callAIMerge(prompt, options = {}) {
  const {
    apiKey,
    model = 'gpt-4o',
    apiBase = 'https://api.openai.com/v1',
    maxTokens = 4096,
    temperature = 0.2,
  } = options;

  if (!apiKey) {
    throw new Error(
      'OpenClaw API Key 未配置。请运行：skl config set user.openapiKey <your-key>'
    );
  }

  const endpoint = `${apiBase.replace(/\/$/, '')}/chat/completions`;

  const requestBody = {
    model,
    messages: [
      {
        role: 'system',
        content:
          '你是一个专业的代码与文档合并助手，擅长处理 OpenClaw Skill 文档的三路合并。你的输出必须是可以直接写入文件的纯文本内容。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: maxTokens,
    temperature,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
    timeout: 120000,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`AI API 调用失败 [${res.status}]: ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI API 返回内容为空');
  }
  return content.trim();
}

// ────────────────────────────────────────────────────────────
//  高层合并接口
// ────────────────────────────────────────────────────────────

/**
 * 执行单个文件的 AI 合并
 *
 * @returns { merged: string, manualReviewNeeded: boolean }
 */
async function mergeFile(params, aiOptions) {
  const prompt = buildMergePrompt(params);
  const merged = await callAIMerge(prompt, aiOptions);
  const manualReviewNeeded = merged.includes('<!-- MERGE_CONFLICT:');
  return { merged, manualReviewNeeded, prompt };
}

/**
 * 执行 skill 级别的批量 AI 合并
 *
 * @param {object} skillMergeTask
 * @param {string} skillMergeTask.skillName
 * @param {object[]} skillMergeTask.conflictFiles - [{fileName, localContent, remoteContent, baseContent}]
 * @param {object}  skillMergeTask.localCommit
 * @param {object}  skillMergeTask.remoteCommit
 * @param {object}  aiOptions - {apiKey, model, apiBase}
 *
 * @returns {{ results: object, allAutoMerged: boolean }}
 */
async function mergeSkillConflicts(skillMergeTask, aiOptions) {
  const { skillName, conflictFiles, localCommit, remoteCommit } = skillMergeTask;
  const results = {};
  let allAutoMerged = true;

  for (const cf of conflictFiles) {
    const result = await mergeFile(
      {
        skillName,
        fileName: cf.fileName,
        localContent: cf.localContent,
        remoteContent: cf.remoteContent,
        baseContent: cf.baseContent || '',
        localAuthor: localCommit?.author || '',
        remoteAuthor: remoteCommit?.author || '',
        localMessage: localCommit?.message || '',
        remoteMessage: remoteCommit?.message || '',
      },
      aiOptions
    );

    results[cf.fileName] = result;
    if (result.manualReviewNeeded) allAutoMerged = false;
  }

  return { results, allAutoMerged };
}

module.exports = {
  buildMergePrompt,
  callAIMerge,
  mergeFile,
  mergeSkillConflicts,
};
