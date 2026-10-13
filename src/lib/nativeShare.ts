import { Capacitor } from '@capacitor/core';

// 앱(Capacitor)으로 실행 중인지 여부. 웹 브라우저에서는 항상 false.
export function isNativeApp(): boolean {
  return typeof window !== 'undefined' && Capacitor.isNativePlatform();
}

// 앱 전용: PNG(dataUrl)를 임시 파일로 저장한 뒤 안드로이드 공유 시트를 연다.
// 공유 시트에서 카카오톡 전송, 파일 저장 등을 선택할 수 있다.
// 플러그인은 앱에서 실행될 때만 불러온다(웹에서는 로드되지 않음).
export async function shareImageNative(
  dataUrl: string,
  fileName: string,
  title: string,
  text: string,
): Promise<void> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);

  const base64 = dataUrl.split(',')[1];
  const { uri } = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
  });

  await Share.share({
    title,
    text,
    files: [uri],
    dialogTitle: title,
  });
}
