/** Lỗi nghiệp vụ có mã để UI / import hiển thị lý do rõ ràng. */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "DomainError";
  }
}
