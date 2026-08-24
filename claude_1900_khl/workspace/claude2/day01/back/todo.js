import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/todos - 할 일 추가
router.post('/api/todos', async (req, res) => {
  try {
    const { content, isDone } = req.body;

    // 필수 필드 검증
    if (!content || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'content is required and must be a string',
      });
    }

    // 내용 길이 검증
    if (content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'content cannot be empty',
      });
    }

    if (content.length > 200) {
      return res.status(400).json({
        success: false,
        error: 'content must be 200 characters or less',
      });
    }

    // DB에 저장
    const todo = await prisma.todo.create({
      data: {
        content: content.trim(),
        isDone: isDone ?? false,
        completedAt: isDone ? new Date() : null,
      },
    });

    return res.status(201).json({
      success: true,
      data: {
        id: todo.id,
        content: todo.content,
        isDone: todo.isDone,
        createdAt: todo.createdAt.toISOString(),
        updatedAt: todo.updatedAt.toISOString(),
        completedAt: todo.completedAt ? todo.completedAt.toISOString() : null,
      },
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create todo',
    });
  }
});

// GET /api/todos - 모든 할 일 조회
router.get('/api/todos', async (req, res) => {
  try {
    const todos = await prisma.todo.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: todos.map(todo => ({
        id: todo.id,
        content: todo.content,
        isDone: todo.isDone,
        createdAt: todo.createdAt.toISOString(),
        updatedAt: todo.updatedAt.toISOString(),
        completedAt: todo.completedAt ? todo.completedAt.toISOString() : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch todos',
    });
  }
});

// PUT /api/todos/:id - 할 일 수정
router.put('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, isDone } = req.body;

    const todoId = parseInt(id);
    if (isNaN(todoId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid todo id',
      });
    }

    // 기존 할 일 확인
    const existing = await prisma.todo.findUnique({
      where: { id: todoId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Todo not found',
      });
    }

    // 수정 데이터 검증
    const updateData = {};
    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'content must be a non-empty string',
        });
      }
      if (content.length > 200) {
        return res.status(400).json({
          success: false,
          error: 'content must be 200 characters or less',
        });
      }
      updateData.content = content.trim();
    }

    if (isDone !== undefined) {
      updateData.isDone = isDone;
      updateData.completedAt = isDone ? new Date() : null;
    }

    const todo = await prisma.todo.update({
      where: { id: todoId },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      data: {
        id: todo.id,
        content: todo.content,
        isDone: todo.isDone,
        createdAt: todo.createdAt.toISOString(),
        updatedAt: todo.updatedAt.toISOString(),
        completedAt: todo.completedAt ? todo.completedAt.toISOString() : null,
      },
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update todo',
    });
  }
});

// DELETE /api/todos/:id - 할 일 삭제
router.delete('/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const todoId = parseInt(id);
    if (isNaN(todoId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid todo id',
      });
    }

    // 기존 할 일 확인
    const existing = await prisma.todo.findUnique({
      where: { id: todoId },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Todo not found',
      });
    }

    await prisma.todo.delete({
      where: { id: todoId },
    });

    return res.status(200).json({
      success: true,
      message: 'Todo deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete todo',
    });
  }
});

// DELETE /api/todos/completed - 완료된 항목 모두 삭제
router.delete('/api/todos/completed', async (_req, res) => {
  try {
    const result = await prisma.todo.deleteMany({
      where: { isDone: true },
    });

    return res.status(200).json({
      success: true,
      message: `Deleted ${result.count} completed todos`,
      count: result.count,
    });
  } catch (error) {
    console.error('Error deleting completed todos:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete completed todos',
    });
  }
});

export default router;
