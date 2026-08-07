import { adminDb, isFirebaseConfigured } from '../firebase/admin';

/**
 * 都城ドライビングスクールの公式コンテンツ（AIが参照する情報）
 */
export interface SchoolContent {
  id: string;
  category: 'basic' | 'course' | 'campaign' | 'graduation' | 'access' | 'camp';
  title: string;
  body: string;
  source_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SchoolContentCategory = SchoolContent['category'];

export const categoryLabels: Record<SchoolContentCategory, string> = {
  basic: '🏫 基本情報',
  course: '🚗 コース・料金',
  campaign: '🎁 キャンペーン・特典',
  graduation: '🎓 卒業式・卒業生',
  access: '📍 アクセス・送迎',
  camp: '⛺ 合宿免許',
};

// ===============================================================
// 初期モックデータ（公式HPと合宿LPから取得した情報を元に設定）
// ===============================================================
let mockContents: SchoolContent[] = [
  // --- 基本情報 ---
  {
    id: 'content-basic-1',
    category: 'basic',
    title: 'スクール基本情報',
    body: `学校名: 都城ドライビングスクール（MDS）
所在地: 宮崎県都城市
公式サイト: https://miyakonojyo-ds.jp
特徴: 宮崎県入校生数 18年連続No.1
営業時間: 要公式サイト確認
電話・問い合わせ: 公式サイトまたはLINEから可能`,
    source_url: 'https://miyakonojyo-ds.jp',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // --- コース・料金 ---
  {
    id: 'content-course-1',
    category: 'course',
    title: '普通車AT免許（通学）',
    body: `コース名: 普通車AT（オートマ）通学免許
対象: 普通車AT限定免許の取得希望者
特徴: 学校・仕事帰りでも通いやすい、スケジュール調整対応、無料送迎バスあり
入校受付: 随時
詳細: 公式サイトにてご確認ください`,
    source_url: 'https://miyakonojyo-ds.jp',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'content-course-2',
    category: 'course',
    title: '普通二輪・大型二輪免許',
    body: `コース名: 普通二輪免許 / 大型二輪免許
特徴: バイク好き・ツーリング希望者に人気、バイク女子歓迎
入校受付: 随時
詳細: 公式サイトにてご確認ください`,
    source_url: 'https://miyakonojyo-ds.jp',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'content-course-3',
    category: 'course',
    title: 'プロ免許（牽引・大型特殊・中型自動車）',
    body: `コース名: 牽引免許 / 大型特殊免許 / 中型自動車免許
対象: キャリアアップ・スキルアップを目指す社会人
特徴: 教育訓練給付金対象コースあり、資格取得支援
入校受付: 随時
詳細: 公式サイトにてご確認ください`,
    source_url: 'https://miyakonojyo-ds.jp',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // --- 合宿免許 ---
  {
    id: 'content-camp-1',
    category: 'camp',
    title: '合宿免許プラン（公式LP情報）',
    body: `合宿免許専用ページ: https://goodmenkyo.com/campaign/miyako/lp4/
キャッチコピー: 早くて安い合宿免許。直販だからこの価格！
最安値: 税込179,900円〜（普通車AT）
卒業最短日数: 最短13日
満足度口コミ評価: 4.8（五つ星）
宮崎県実績: 宮崎県入校生数18年連続No.1
申込方法: Webからの仮申込み、またはLINEで気軽に相談（クイック返信対応）
オンライン学科対応: あり（全国どこからでも入校可）
特徴: 宮崎最安値に挑戦中！格安プラン限定開催`,
    source_url: 'https://goodmenkyo.com/campaign/miyako/lp4/',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'content-camp-2',
    category: 'camp',
    title: '合宿免許 問い合わせ・申込み先',
    body: `仮申込みURL: https://goodmenkyo.com/campaign/miyako/lp4/#form
LINE相談: https://l-tra.com/ad/LTRj1RT4zN
特徴: LINEで気軽に相談可能、クイック返信対応`,
    source_url: 'https://goodmenkyo.com/campaign/miyako/lp4/',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // --- キャンペーン ---
  {
    id: 'content-campaign-1',
    category: 'campaign',
    title: '友達紹介キャンペーン（例）',
    body: `※このカテゴリにはキャンペーン情報を随時追加してください。
例: 友達紹介で割引特典、早期申込み割引 等
現在実施中のキャンペーン: 公式サイトをご確認ください`,
    source_url: 'https://miyakonojyo-ds.jp',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // --- アクセス・送迎 ---
  {
    id: 'content-access-1',
    category: 'access',
    title: 'アクセス・無料送迎バス',
    body: `所在地: 宮崎県都城市
無料送迎バス: あり（都城市内および周辺エリア）
特徴: 学校・職場帰りでも通学しやすい立地
詳細エリア: 公式サイトにてご確認ください`,
    source_url: 'https://miyakonojyo-ds.jp',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ===============================================================
// DBサービスクラス
// ===============================================================
export class SchoolContentService {
  /**
   * 公式コンテンツ一覧を取得
   */
  static async getAll(activeOnly = true): Promise<SchoolContent[]> {
    if (!isFirebaseConfigured() || !adminDb) {
      const list = activeOnly ? mockContents.filter((c) => c.is_active) : [...mockContents];
      return list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }

    try {
      let query: any = adminDb.collection('school_content');
      if (activeOnly) {
        query = query.where('is_active', '==', true);
      }
      const snapshot = await query.orderBy('updated_at', 'desc').get();
      const contents: SchoolContent[] = [];
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        contents.push({
          id: doc.id,
          category: data.category,
          title: data.title,
          body: data.body,
          source_url: data.source_url || null,
          is_active: data.is_active !== false,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        });
      });
      return contents;
    } catch (e) {
      console.warn('Firestore SchoolContent.getAll failed, falling back to mock:', e);
      return activeOnly ? mockContents.filter((c) => c.is_active) : [...mockContents];
    }
  }

  /**
   * カテゴリ絞り込みで取得
   */
  static async getByCategory(category: SchoolContentCategory): Promise<SchoolContent[]> {
    const all = await this.getAll(true);
    return all.filter((c) => c.category === category);
  }

  /**
   * AI生成用のコンテキスト文字列を構築
   * （カテゴリ優先度を考慮してまとめる）
   */
  static async buildAIContext(categories?: SchoolContentCategory[]): Promise<string> {
    const all = await this.getAll(true);
    const filtered = categories ? all.filter((c) => categories.includes(c.category)) : all;

    if (filtered.length === 0) {
      return '（公式情報が登録されていません）';
    }

    const grouped: Partial<Record<SchoolContentCategory, SchoolContent[]>> = {};
    filtered.forEach((c) => {
      if (!grouped[c.category]) grouped[c.category] = [];
      grouped[c.category]!.push(c);
    });

    const lines: string[] = [];
    for (const [cat, items] of Object.entries(grouped)) {
      const label = categoryLabels[cat as SchoolContentCategory] || cat;
      lines.push(`\n## ${label}`);
      items!.forEach((item) => {
        lines.push(`### ${item.title}`);
        lines.push(item.body);
      });
    }

    return lines.join('\n');
  }

  /**
   * コンテンツの作成
   */
  static async create(
    data: Omit<SchoolContent, 'id' | 'created_at' | 'updated_at'>
  ): Promise<SchoolContent> {
    const nowStr = new Date().toISOString();
    const newItem: SchoolContent = {
      ...data,
      id: `content-${Date.now()}`,
      created_at: nowStr,
      updated_at: nowStr,
    };

    if (!isFirebaseConfigured() || !adminDb) {
      mockContents.push(newItem);
      return newItem;
    }

    try {
      const docRef = await adminDb.collection('school_content').add({
        ...data,
        created_at: nowStr,
        updated_at: nowStr,
      });
      return { ...newItem, id: docRef.id };
    } catch (e) {
      console.warn('Firestore SchoolContent.create failed, falling back to mock:', e);
      mockContents.push(newItem);
      return newItem;
    }
  }

  /**
   * コンテンツの更新
   */
  static async update(
    id: string,
    data: Partial<Omit<SchoolContent, 'id' | 'created_at'>>
  ): Promise<SchoolContent | null> {
    const nowStr = new Date().toISOString();

    if (!isFirebaseConfigured() || !adminDb) {
      const index = mockContents.findIndex((c) => c.id === id);
      if (index === -1) return null;
      mockContents[index] = { ...mockContents[index], ...data, updated_at: nowStr };
      return mockContents[index];
    }

    try {
      const docRef = adminDb.collection('school_content').doc(id);
      await docRef.update({ ...data, updated_at: nowStr });
      const doc = await docRef.get();
      if (!doc.exists) return null;
      const d = doc.data()!;
      return {
        id: doc.id,
        category: d.category,
        title: d.title,
        body: d.body,
        source_url: d.source_url || null,
        is_active: d.is_active !== false,
        created_at: d.created_at,
        updated_at: d.updated_at,
      };
    } catch (e) {
      console.warn('Firestore SchoolContent.update failed, falling back to mock:', e);
      const index = mockContents.findIndex((c) => c.id === id);
      if (index === -1) return null;
      mockContents[index] = { ...mockContents[index], ...data, updated_at: nowStr };
      return mockContents[index];
    }
  }

  /**
   * コンテンツの削除
   */
  static async delete(id: string): Promise<boolean> {
    if (!isFirebaseConfigured() || !adminDb) {
      const before = mockContents.length;
      mockContents = mockContents.filter((c) => c.id !== id);
      return mockContents.length < before;
    }

    try {
      await adminDb.collection('school_content').doc(id).delete();
      return true;
    } catch (e) {
      console.warn('Firestore SchoolContent.delete failed, falling back to mock:', e);
      const before = mockContents.length;
      mockContents = mockContents.filter((c) => c.id !== id);
      return mockContents.length < before;
    }
  }
}
