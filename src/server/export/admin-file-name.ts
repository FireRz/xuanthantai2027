/** Tên file xuất quản trị: thời điểm xuất theo giờ Việt Nam, chỉ ký tự ASCII an toàn. */
export function adminExportFileName(at: Date): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  return `du-lieu-xuan-than-tai_${p.year}${p.month}${p.day}-${p.hour}${p.minute}.xlsx`;
}
