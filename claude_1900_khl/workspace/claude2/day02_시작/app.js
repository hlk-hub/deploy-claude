const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const prisma = require('./prisma/client');

const app = express();

// Swagger 설정
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '게시판 API',
      version: '1.0.0',
      description: '비회원 게시판 API - CRUD 및 댓글 기능',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: 'http://localhost:8000/api',
        description: '로컬 개발 서버',
        variables: {}
      },
      {
        url: 'http://localhost:3000/api',
        description: '프로덕션 서버 (필요시 변경)',
        variables: {}
      }
    ],
    tags: [
      {
        name: 'Posts',
        description: '게시글 관리 API - 게시글의 조회, 작성, 수정, 삭제 기능'
      },
      {
        name: 'Comments',
        description: '댓글 관리 API - 댓글의 조회, 작성, 삭제 기능'
      }
    ],
    components: {
      schemas: {
        Post: {
          type: 'object',
          description: '게시글 정보',
          properties: {
            id: { type: 'integer', description: '게시글 고유 ID' },
            title: { type: 'string', description: '게시글 제목 (최대 200자)' },
            content: { type: 'string', description: '게시글 내용' },
            author: { type: 'string', description: '작성자 이름 (최대 50자)' },
            views: { type: 'integer', description: '게시글 조회수' },
            createdAt: { type: 'string', format: 'date-time', description: '게시글 작성 일시' },
            updatedAt: { type: 'string', format: 'date-time', description: '게시글 수정 일시' }
          }
        },
        Comment: {
          type: 'object',
          description: '댓글 정보',
          properties: {
            id: { type: 'integer', description: '댓글 고유 ID' },
            content: { type: 'string', description: '댓글 내용 (최대 500자)' },
            author: { type: 'string', description: '댓글 작성자 이름 (최대 50자)' },
            postId: { type: 'integer', description: '댓글이 속한 게시글 ID' },
            createdAt: { type: 'string', format: 'date-time', description: '댓글 작성 일시' }
          }
        }
      }
    }
  },
  apis: ['./app.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 미들웨어 설정
app.use(express.json());

// 정적 파일 제공 - 절대 경로 사용
const publicPath = path.resolve(__dirname, './public');
console.log(`정적 파일 경로: ${publicPath}`);
app.use(express.static(publicPath));

// CORS 설정
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 요청 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// SPA 라우팅 지원
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, './public/index.html'));
});

// 포맷팅 함수
function formatPost(post) {
  return {
    ...post,
    author: post.authorName,
    views: post.viewCount,
    authorName: undefined,
    viewCount: undefined
  };
}

function formatComment(comment) {
  return {
    ...comment,
    author: comment.authorName,
    authorName: undefined
  };
}

function formatPostWithComments(post) {
  return {
    ...post,
    author: post.authorName,
    views: post.viewCount,
    authorName: undefined,
    viewCount: undefined,
    comments: post.comments?.map(formatComment) || []
  };
}

// ====== POST (게시글) API ======

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: 모든 게시글 목록 조회
 *     description: 최신순으로 정렬된 모든 게시글의 목록을 조회합니다. 페이지네이션은 클라이언트에서 처리합니다.
 *     operationId: listPosts
 *     tags:
 *       - Posts
 *     responses:
 *       200:
 *         description: 게시글 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 *       500:
 *         description: 서버 오류
 */
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        content: true,
        authorName: true,
        viewCount: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const formattedPosts = posts.map(formatPost);
    res.status(200).json(formattedPosts);
  } catch (error) {
    console.error('GET /api/posts 에러:', error);
    res.status(500).json({
      success: false,
      message: '게시글 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /posts/{id}:
 *   get:
 *     summary: 특정 게시글 상세 조회
 *     description: 특정 게시글의 상세 정보와 댓글 목록을 조회하고 조회수를 증가시킵니다.
 *     operationId: getPost
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 게시글 조회 성공 및 댓글 포함
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   allOf:
 *                     - $ref: '#/components/schemas/Post'
 *                     - type: object
 *                       properties:
 *                         comments:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Comment'
 *       400:
 *         description: 잘못된 ID 형식
 *       404:
 *         description: 게시글을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // ID 검증
    const postId = Number(id);
    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID는 양의 정수여야 합니다.'
      });
    }

    // 게시글 존재 여부 확인 및 조회수 증가
    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        viewCount: {
          increment: 1
        }
      },
      include: {
        comments: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    const formattedPost = formatPostWithComments(post);
    res.status(200).json({
      data: formattedPost
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: '해당 게시글을 찾을 수 없습니다.'
      });
    }
    console.error('GET /api/posts/:id 에러:', error);
    res.status(500).json({
      success: false,
      message: '게시글 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: 새 게시글 작성
 *     description: 새로운 게시글을 작성합니다. 제목, 내용, 작성자명은 필수입니다.
 *     operationId: createPost
 *     tags:
 *       - Posts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - author
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 description: 게시글 제목
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 description: 게시글 내용
 *               author:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: 작성자 이름
 *     responses:
 *       201:
 *         description: 게시글 작성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: 입력값 검증 실패
 *       500:
 *         description: 서버 오류
 */
app.post('/api/posts', async (req, res) => {
  try {
    // 프론트엔드에서 author 필드로 보낼 수 있으므로 둘 다 지원
    const { title, content, author, authorName } = req.body;
    const finalAuthorName = authorName || author;

    // 입력값 검증
    if (!title || typeof title !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'title은 필수 입력값이며 문자열이어야 합니다.'
      });
    }

    if (title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '제목은 비어있을 수 없습니다.'
      });
    }

    if (title.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message: '제목은 200자 이하여야 합니다.'
      });
    }

    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'content는 필수 입력값이며 문자열이어야 합니다.'
      });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '내용은 비어있을 수 없습니다.'
      });
    }

    if (!finalAuthorName || typeof finalAuthorName !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'author은 필수 입력값이며 문자열이어야 합니다.'
      });
    }

    if (finalAuthorName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '작성자명은 비어있을 수 없습니다.'
      });
    }

    if (finalAuthorName.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: '작성자명은 50자 이하여야 합니다.'
      });
    }

    // 게시글 생성
    const post = await prisma.post.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        authorName: finalAuthorName.trim()
      }
    });

    const formattedPost = formatPost(post);
    res.status(201).json({
      data: formattedPost
    });
  } catch (error) {
    console.error('POST /api/posts 에러:', error);
    res.status(500).json({
      success: false,
      message: '게시글 작성 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /posts/{id}:
 *   put:
 *     summary: 게시글 수정
 *     description: 기존 게시글을 부분 수정합니다. title, content, author 중 최소 하나 이상 필요합니다.
 *     operationId: updatePost
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 게시글 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *                 description: 게시글 제목
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 description: 게시글 내용
 *               author:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: 작성자 이름
 *     responses:
 *       200:
 *         description: 게시글 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Post'
 *       400:
 *         description: 입력값 검증 실패
 *       404:
 *         description: 게시글을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
app.put('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, author, authorName } = req.body;

    // ID 검증
    const postId = Number(id);
    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID는 양의 정수여야 합니다.'
      });
    }

    // 수정할 데이터 구성
    const updateData = {};

    if (title !== undefined) {
      if (typeof title !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'title은 문자열이어야 합니다.'
        });
      }

      if (title.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: '제목은 비어있을 수 없습니다.'
        });
      }

      if (title.trim().length > 200) {
        return res.status(400).json({
          success: false,
          message: '제목은 200자 이하여야 합니다.'
        });
      }

      updateData.title = title.trim();
    }

    if (content !== undefined) {
      if (typeof content !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'content는 문자열이어야 합니다.'
        });
      }

      if (content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: '내용은 비어있을 수 없습니다.'
        });
      }

      updateData.content = content.trim();
    }

    // author 필드 처리
    const finalAuthorName = authorName || author;
    if (finalAuthorName !== undefined) {
      if (typeof finalAuthorName !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'author는 문자열이어야 합니다.'
        });
      }

      if (finalAuthorName.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: '작성자명은 비어있을 수 없습니다.'
        });
      }

      if (finalAuthorName.trim().length > 50) {
        return res.status(400).json({
          success: false,
          message: '작성자명은 50자 이하여야 합니다.'
        });
      }

      updateData.authorName = finalAuthorName.trim();
    }

    // 수정할 데이터가 없으면 에러
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: '수정할 데이터가 없습니다.'
      });
    }

    // 게시글 수정
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: updateData
    });

    const formattedPost = formatPost(updatedPost);
    res.status(200).json({
      data: formattedPost
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: '해당 게시글을 찾을 수 없습니다.'
      });
    }
    console.error('PUT /api/posts/:id 에러:', error);
    res.status(500).json({
      success: false,
      message: '게시글 수정 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /posts/{id}:
 *   delete:
 *     summary: 게시글 삭제
 *     description: 게시글을 삭제합니다. 관련된 모든 댓글은 자동으로 삭제됩니다.
 *     operationId: deletePost
 *     tags:
 *       - Posts
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 게시글 삭제 성공
 *       400:
 *         description: 잘못된 ID 형식
 *       404:
 *         description: 게시글을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // ID 검증
    const postId = Number(id);
    if (!Number.isInteger(postId) || postId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID는 양의 정수여야 합니다.'
      });
    }

    // 게시글 삭제 (관련 댓글은 CASCADE로 자동 삭제)
    const deletedPost = await prisma.post.delete({
      where: { id: postId }
    });

    res.status(200).json({
      message: '게시글이 삭제되었습니다.'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: '해당 게시글을 찾을 수 없습니다.'
      });
    }
    console.error('DELETE /api/posts/:id 에러:', error);
    res.status(500).json({
      success: false,
      message: '게시글 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// ====== COMMENT (댓글) API ======

/**
 * @swagger
 * /posts/{postId}/comments:
 *   get:
 *     summary: 게시글 댓글 목록 조회
 *     description: 특정 게시글의 모든 댓글을 최신순으로 조회합니다.
 *     operationId: listComments
 *     tags:
 *       - Comments
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 게시글 ID
 *     responses:
 *       200:
 *         description: 댓글 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 *       400:
 *         description: 잘못된 postId 형식
 *       404:
 *         description: 게시글을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;

    // PostID 검증
    const postIdNum = Number(postId);
    if (!Number.isInteger(postIdNum) || postIdNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'postId는 양의 정수여야 합니다.'
      });
    }

    // 게시글 존재 여부 확인
    const post = await prisma.post.findUnique({
      where: { id: postIdNum }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '해당 게시글을 찾을 수 없습니다.'
      });
    }

    // 댓글 목록 조회
    const comments = await prisma.comment.findMany({
      where: { postId: postIdNum },
      orderBy: { createdAt: 'desc' }
    });

    const formattedComments = comments.map(formatComment);
    res.status(200).json(formattedComments);
  } catch (error) {
    console.error('GET /api/posts/:postId/comments 에러:', error);
    res.status(500).json({
      success: false,
      message: '댓글 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /posts/{postId}/comments:
 *   post:
 *     summary: 댓글 작성
 *     description: 게시글에 새 댓글을 작성합니다. 내용과 작성자명은 필수입니다.
 *     operationId: createComment
 *     tags:
 *       - Comments
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 게시글 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - author
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 500
 *                 description: 댓글 내용
 *               author:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: 댓글 작성자 이름
 *     responses:
 *       201:
 *         description: 댓글 작성 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: 입력값 검증 실패
 *       404:
 *         description: 게시글을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
app.post('/api/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { content, author, authorName } = req.body;
    const finalAuthorName = authorName || author;

    // PostID 검증
    const postIdNum = Number(postId);
    if (!Number.isInteger(postIdNum) || postIdNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'postId는 양의 정수여야 합니다.'
      });
    }

    // 게시글 존재 여부 확인
    const post = await prisma.post.findUnique({
      where: { id: postIdNum }
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: '해당 게시글을 찾을 수 없습니다.'
      });
    }

    // 입력값 검증
    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'content는 필수 입력값이며 문자열이어야 합니다.'
      });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '댓글 내용은 비어있을 수 없습니다.'
      });
    }

    if (content.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: '댓글은 500자 이하여야 합니다.'
      });
    }

    if (!finalAuthorName || typeof finalAuthorName !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'author은 필수 입력값이며 문자열이어야 합니다.'
      });
    }

    if (finalAuthorName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '작성자명은 비어있을 수 없습니다.'
      });
    }

    if (finalAuthorName.trim().length > 50) {
      return res.status(400).json({
        success: false,
        message: '작성자명은 50자 이하여야 합니다.'
      });
    }

    // 댓글 생성
    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        authorName: finalAuthorName.trim(),
        postId: postIdNum
      }
    });

    const formattedComment = formatComment(comment);
    res.status(201).json(formattedComment);
  } catch (error) {
    console.error('POST /api/posts/:postId/comments 에러:', error);
    res.status(500).json({
      success: false,
      message: '댓글 작성 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /comments/{id}:
 *   delete:
 *     summary: 댓글 삭제
 *     description: 특정 댓글을 삭제합니다.
 *     operationId: deleteComment
 *     tags:
 *       - Comments
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 댓글 ID
 *     responses:
 *       200:
 *         description: 댓글 삭제 성공
 *       400:
 *         description: 잘못된 ID 형식
 *       404:
 *         description: 댓글을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
app.delete('/api/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // ID 검증
    const commentId = Number(id);
    if (!Number.isInteger(commentId) || commentId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID는 양의 정수여야 합니다.'
      });
    }

    // 댓글 삭제
    const deletedComment = await prisma.comment.delete({
      where: { id: commentId }
    });

    res.status(200).json({
      message: '댓글이 삭제되었습니다.'
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: '해당 댓글을 찾을 수 없습니다.'
      });
    }
    console.error('DELETE /api/comments/:id 에러:', error);
    res.status(500).json({
      success: false,
      message: '댓글 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '요청한 엔드포인트를 찾을 수 없습니다.'
  });
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
  console.error('전체 에러:', err);
  res.status(500).json({
    success: false,
    message: '서버 오류가 발생했습니다.',
    error: err.message
  });
});

// 서버 시작
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});

module.exports = app;
