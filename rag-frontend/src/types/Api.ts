export interface ApiData<T> {
  count: number,
  data: T[]
}

export interface ApiMessage {
  status: boolean
  message: string
}