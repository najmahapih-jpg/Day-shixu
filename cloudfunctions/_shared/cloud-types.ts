export type CloudSuccess<T> = {
  code: 0
  data: T
}

export type CloudFailure = {
  code: -1
  message: string
  data?: unknown
}

export type CloudResult<T> = CloudSuccess<T> | CloudFailure
