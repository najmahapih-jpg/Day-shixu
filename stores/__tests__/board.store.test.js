function createDeferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve))
}

function createNote(overrides = {}) {
  return {
    _id: 'note-1',
    _openid: 'user-1',
    content: 'Alpha',
    color: 'yellow',
    size: 2,
    x: 0,
    y: 0,
    rotation: 0,
    fontSize: 'md',
    textAlign: 'left',
    textVertical: 'top',
    fontFamily: 'hand',
    positionMode: 'auto',
    noteShape: 'rect',
    imageUrl: '',
    noteType: 'text',
    checkItems: [],
    groupId: '',
    linkedHabitId: '',
    isPinned: false,
    tags: [],
    createdAt: '2026-04-01T08:00:00+08:00',
    updatedAt: '2026-04-01T08:00:00+08:00',
    ...overrides,
  }
}

function buildUni() {
  return {
    showToast: jest.fn(),
    getStorageSync: jest.fn(() => ''),
    setStorageSync: jest.fn(),
    removeStorageSync: jest.fn(),
    getStorageInfoSync: jest.fn(() => ({ keys: [] })),
  }
}

function createMocks() {
  return {
    boardService: {
      getNotes: jest.fn(),
      createNote: jest.fn(),
      updateNote: jest.fn(),
      deleteNote: jest.fn(),
    },
    cloud: {
      getBeijingIsoNow: jest.fn(() => '2026-04-09T09:00:00+08:00'),
    },
  }
}

function loadBoardStore(mocks) {
  jest.resetModules()
  jest.doMock('@/services/boardService', () => mocks.boardService)
  jest.doMock('@/services/cloud', () => mocks.cloud)

  const { useBoardStore } = require('@/stores/board')
  return useBoardStore()
}

describe('useBoardStore high-value state protections', () => {
  let mockUni
  let mocks
  let store

  beforeEach(() => {
    mockUni = buildUni()
    global.uni = mockUni
    mocks = createMocks()
    store = loadBoardStore(mocks)
    store.$reset()
  })

  afterEach(() => {
    delete global.uni
    jest.clearAllMocks()
  })

  test('createNote inserts optimistic note immediately and replaces it with normalized server note', async () => {
    const deferred = createDeferred()
    mocks.boardService.createNote.mockReturnValue(deferred.promise)

    const action = store.createNote({
      content: '   ',
      noteType: 'checklist',
      checkItems: [
        { id: '', text: ' First task ', checked: true },
        { id: '2', text: ' ', checked: false },
      ],
      positionMode: 'manual',
      x: 12.4,
      y: 5.6,
      rotation: 19.8,
      fontFamily: 'weird',
      tags: [' work ', 'work', 'life', 'focus'],
      groupId: '  team-sync-12345678901234567890  ',
      linkedHabitId: '  habit-1  ',
    })

    expect(store.notes).toHaveLength(1)
    expect(store.notes[0]).toEqual(expect.objectContaining({
      _id: expect.stringMatching(/^local_/),
      content: 'First task',
      noteType: 'checklist',
      positionMode: 'manual',
      x: 12.4,
      y: 5.6,
      rotation: 18,
      fontFamily: 'hand',
      tags: ['work', 'life', 'focus'],
      linkedHabitId: 'habit-1',
    }))
    expect(store.notes[0].groupId).toHaveLength(24)
    expect(mocks.boardService.createNote).toHaveBeenCalledWith(expect.objectContaining({
      content: 'First task',
      noteType: 'checklist',
      positionMode: 'manual',
      x: 12.4,
      y: 5.6,
      rotation: 18,
      fontFamily: 'hand',
      tags: ['work', 'life', 'focus'],
      linkedHabitId: 'habit-1',
    }))

    deferred.resolve(createNote({
      _id: 'note-remote',
      content: '',
      noteType: 'checklist',
      checkItems: [{ id: 'srv-1', text: 'First task', checked: true }],
      positionMode: 'manual',
      x: 12.4,
      y: 5.6,
      rotation: 3,
      tags: ['work', 'life', 'focus'],
      groupId: 'team-sync-12345678901234',
      linkedHabitId: 'habit-1',
      updatedAt: '2026-04-09T10:00:00+08:00',
      createdAt: '2026-04-09T09:00:00+08:00',
    }))
    const created = await action

    expect(created).toEqual(expect.objectContaining({
      _id: 'note-remote',
      content: 'First task',
      noteType: 'checklist',
    }))
    expect(store.notes[0]).toEqual(expect.objectContaining({
      _id: 'note-remote',
      content: 'First task',
    }))
    expect(mockUni.setStorageSync).toHaveBeenCalled()
  })

  test('updateNote keeps normalized local patch when remote update fails and local-mode toast only fires once', async () => {
    const existing = createNote({
      _id: 'note-1',
      content: 'Old content',
      noteType: 'checklist',
      checkItems: [{ id: '1', text: 'Old task', checked: false }],
      positionMode: 'manual',
      x: 18,
      y: 20,
      tags: ['old'],
      groupId: 'old-group',
    })
    store.notes = [existing]
    mocks.boardService.createNote.mockRejectedValueOnce(new Error('offline'))
    mocks.boardService.updateNote.mockRejectedValueOnce(new Error('offline'))

    const offlineCreated = await store.createNote({ content: 'Local fallback' })
    expect(offlineCreated._id).toMatch(/^local_/)
    expect(mockUni.showToast).toHaveBeenCalledTimes(1)

    const updateAction = store.updateNote('note-1', {
      content: '  Updated content  ',
      noteType: 'text',
      checkItems: [{ id: '2', text: ' Should be dropped ', checked: true }],
      positionMode: 'auto',
      x: 999,
      y: 888,
      rotation: 99,
      imageUrl: '  https://img.example/test.png  ',
      linkedHabitId: '  habit-2  ',
      groupId: '  next-group-12345678901234567890  ',
      tags: [' focus ', 'focus', 'plan', 'deep'],
    })

    expect(store.notes.find((note) => note._id === 'note-1')).toEqual(expect.objectContaining({
      content: 'Updated content',
      noteType: 'text',
      checkItems: [],
      positionMode: 'auto',
      x: 0,
      y: 0,
      rotation: 18,
      imageUrl: 'https://img.example/test.png',
      linkedHabitId: 'habit-2',
      tags: ['focus', 'plan', 'deep'],
    }))
    expect(mocks.boardService.updateNote).toHaveBeenCalledWith('note-1', expect.objectContaining({
      content: 'Updated content',
      noteType: 'text',
      checkItems: [],
      positionMode: 'auto',
      x: 0,
      y: 0,
      rotation: 18,
      imageUrl: 'https://img.example/test.png',
      linkedHabitId: 'habit-2',
      tags: ['focus', 'plan', 'deep'],
    }))

    const updated = await updateAction

    expect(updated).toEqual(expect.objectContaining({
      _id: 'note-1',
      content: 'Updated content',
      noteType: 'text',
    }))
    expect(store.notes.find((note) => note._id === 'note-1')).toEqual(expect.objectContaining({
      content: 'Updated content',
      noteType: 'text',
      checkItems: [],
      linkedHabitId: 'habit-2',
    }))
    expect(mockUni.showToast).toHaveBeenCalledTimes(1)
  })

  test('deleteNote removes locally first and still warns when remote deletion fails', async () => {
    store.notes = [
      createNote({ _id: 'note-1', content: 'Delete me' }),
      createNote({ _id: 'note-2', content: 'Keep me' }),
    ]
    mocks.boardService.deleteNote.mockRejectedValueOnce(new Error('offline'))

    const action = store.deleteNote('note-1')

    expect(store.notes.map((note) => note._id)).toEqual(['note-2'])
    await action

    expect(mockUni.showToast).toHaveBeenCalledTimes(1)
    expect(mockUni.showToast).toHaveBeenCalledWith(expect.objectContaining({ icon: 'none' }))
  })

  test('batchDelete de-dupes ids, removes locally, and warns once if any remote delete fails', async () => {
    store.notes = [
      createNote({ _id: 'note-1' }),
      createNote({ _id: 'note-2' }),
      createNote({ _id: 'note-3' }),
    ]
    mocks.boardService.deleteNote.mockImplementation((id) => (
      id === 'note-2' ? Promise.reject(new Error('boom')) : Promise.resolve()
    ))

    store.batchDelete(['note-1', 'note-2', 'note-2'])

    expect(store.notes.map((note) => note._id)).toEqual(['note-3'])
    expect(mocks.boardService.deleteNote).toHaveBeenCalledTimes(2)

    await flushPromises()
    await flushPromises()

    expect(mockUni.showToast).toHaveBeenCalledTimes(1)
  })

  test('fetchNotes falls back to local storage and normalizes persisted notes when remote fetch fails', async () => {
    mockUni.getStorageSync.mockReturnValueOnce(JSON.stringify([
      createNote({
        _id: 'stored-1',
        content: '   ',
        noteType: 'checklist',
        checkItems: [
          { id: '', text: ' Stored task ', checked: true },
          { id: '2', text: ' ', checked: false },
        ],
        positionMode: 'auto',
        x: 88,
        y: 77,
        rotation: 27,
        fontSize: 'huge',
        textAlign: 'middle',
        textVertical: 'low',
        fontFamily: 'unknown',
        noteShape: 'triangle',
        imageUrl: '  https://img.example/stored.png  ',
        groupId: '  board-group-12345678901234567890  ',
        tags: [' focus ', 'focus', 'plan', 'extra'],
      }),
    ]))
    mocks.boardService.getNotes.mockRejectedValueOnce(new Error('offline'))

    await store.fetchNotes()

    expect(store.notes).toHaveLength(1)
    expect(store.notes[0]).toEqual(expect.objectContaining({
      _id: 'stored-1',
      content: 'Stored task',
      noteType: 'checklist',
      checkItems: [{ id: '1', text: 'Stored task', checked: true }],
      positionMode: 'auto',
      x: 0,
      y: 0,
      rotation: 18,
      fontSize: 'md',
      textAlign: 'left',
      textVertical: 'top',
      fontFamily: 'hand',
      noteShape: 'rect',
      imageUrl: 'https://img.example/stored.png',
      tags: ['focus', 'plan', 'extra'],
    }))
    expect(store.notes[0].groupId).toHaveLength(24)
    expect(store.loading).toBe(false)
  })

  test('storage write failures do not break optimistic create flow', async () => {
    mockUni.setStorageSync.mockImplementation(() => {
      throw new Error('quota exceeded')
    })
    mocks.boardService.createNote.mockResolvedValueOnce(createNote({
      _id: 'note-write-safe',
      content: 'Safe note',
      createdAt: '2026-04-09T09:00:00+08:00',
      updatedAt: '2026-04-09T09:00:00+08:00',
    }))

    await expect(store.createNote({ content: 'Safe note' })).resolves.toEqual(
      expect.objectContaining({
        _id: 'note-write-safe',
        content: 'Safe note',
      }),
    )

    expect(store.notes[0]).toEqual(expect.objectContaining({
      _id: 'note-write-safe',
      content: 'Safe note',
    }))
  })

  test('sort mode switching stays deterministic across updated, color, and default views', () => {
    store.notes = [
      createNote({
        _id: 'blue-late',
        color: 'blue',
        createdAt: '2026-04-03T08:00:00+08:00',
        updatedAt: '2026-04-06T08:00:00+08:00',
      }),
      createNote({
        _id: 'yellow-pinned',
        color: 'yellow',
        isPinned: true,
        createdAt: '2026-04-01T08:00:00+08:00',
        updatedAt: '2026-04-02T08:00:00+08:00',
      }),
      createNote({
        _id: 'pink-new',
        color: 'pink',
        createdAt: '2026-04-05T08:00:00+08:00',
        updatedAt: '2026-04-04T08:00:00+08:00',
      }),
    ]

    store.setSortMode('updated')
    expect(store.notes.map((note) => note._id)).toEqual([
      'yellow-pinned',
      'blue-late',
      'pink-new',
    ])

    store.cycleSortMode()
    expect(store.sortMode).toBe('color')
    expect(store.notes.map((note) => note._id)).toEqual([
      'yellow-pinned',
      'pink-new',
      'blue-late',
    ])

    store.cycleSortMode()
    expect(store.sortMode).toBe('default')
    expect(store.notes.map((note) => note._id)).toEqual([
      'yellow-pinned',
      'pink-new',
      'blue-late',
    ])
  })
})
