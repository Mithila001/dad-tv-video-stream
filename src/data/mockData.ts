export type VideoFormat = 'MP4' | 'MOV'

export type LiveQueueStatus = 'playing' | 'upcoming'

export interface VideoAsset {
  readonly id: string
  readonly title: string
  readonly duration: string
  readonly size: string
  readonly format: VideoFormat
  readonly uploadDate: string
  readonly thumbnailUrl: string
}

export interface LiveQueueItem {
  readonly id: string
  readonly title: string
  readonly thumbnailUrl: string
  readonly status: LiveQueueStatus
  readonly startsInMinutes?: number
  readonly sourceVideoId: string
}

export const videoLibrary = [
  {
    id: 'ethereal-highlands-4k',
    title: 'Ethereal Highlands 4K',
    duration: '12:45',
    size: '1.2 GB',
    format: 'MP4',
    uploadDate: '2023-10-12',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB4DPH2ib_AA9DQhzFreHOKkMlWWp9WPyOn2GKIc-QORQ7mPbXgkA2H-ZzAz_mPzsZwRlTjChymOI5eiuwErW_WXKe98FNPDUV5-2E1U87K5SAMD-WJxAogWKZrKOZ29T02gCmtjFRv3SnhUdyg0Cgv3qVcRTbtLUQo9xDHmlXD86Bfqbhd6AIxK1GpKVbxvmjSrj4DlAMFKxsaUdqDQmczaNkbEA9LllTE3FmFqDcVAs6TzyU56eUYZNtEq5X2XbzIRm9seMSHjz0',
  },
  {
    id: 'cybernetic-flow-loop',
    title: 'Cybernetic Flow Loop',
    duration: '08:15',
    size: '4.8 GB',
    format: 'MOV',
    uploadDate: '2023-10-11',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAUFSkLqPot-MkRPAALKpRABKrq2RZgx47W7iRlN9t6sfQKhYKUlaDZdhMwqDv5wDZYP2aez5KXYb_a3wNQYyN65qI49zLVPyQY-2qKH_4IdM-8vRhsdEtmPXeWPCUbGeB_MwjBt05_owa64wu4sp35WBBqbkvBFZ9B0LXlNR4flQLfe8kSQFvp03-zVeN7mkhKhmeFv8wAchzrkAbTXO80GDjI-o1spGQ-gaNYuglhx2lIVMKABw5sXG3eYGPRdxFQKmMMIC_SRbI',
  },
  {
    id: 'northern-lights-skyward',
    title: 'Northern Lights Skyward',
    duration: '03:50',
    size: '2.1 GB',
    format: 'MP4',
    uploadDate: '2023-10-10',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB4wBq1mjmn9r0Jg4H-N_yzs0d7IP-4wumdFrCX19MiH-MwR-qsdCrCyksRPJ4RSjxncpIGOkCcns8bN-KhLXlLS_qqUwcyvpTawh3-PBM-D-sWKYFyugN-ApxHxQbF4qaeuJ39E0ABZZYIP1SmAtDreoqfBm99XblzwyCE1swRV9L_rAwJgoxrzeTxYUuOedds4cquxjfvyBCxw8QnAHrMwQ0IWqKLO7MnHqyLc-GjHkwAs-HSygWNFKBgKnQfo0e4b2gwPkKlLDg',
  },
  {
    id: 'alpine-reflection-8k',
    title: 'Alpine Reflection 8K',
    duration: '15:00',
    size: '0.9 GB',
    format: 'MP4',
    uploadDate: '2023-10-09',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAtj_wF3QZUS-8PL9tVWEQKv9T9CpFeewpkTdZpSOJPFt_3fyNz_oXINog-nSo3enzdBwZ8JA5KPD3-gEbZxtwoNRTOre9Pp04xlkLGXW0O0O1XMF-6EZWuC9nySjadx75buwfU59J_9a4pJxlkMPgwlvMlTaPzLyM2Uy8mA1-kZSSEFPwcpfF3trPoK8KKvmbRuZz-RpJOXLNC5_LkyGdRkuTJ_ce7QStWoWWf-_To1bTr3hAqc3uzDIapoupun2oGdyY5v84Xuyk',
  },
  {
    id: 'rainforest-canopy-drone',
    title: 'Rainforest Canopy Drone',
    duration: '04:20',
    size: '5.5 GB',
    format: 'MP4',
    uploadDate: '2023-10-08',
    thumbnailUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC41M8gwaLvuf4hoejlvKQRpBx6Y30RpybjKHLKV-ANfEfnSQ9mkxRzws7VLDyd8sEI0G4h5YZv8KImlipMNrb_oup1kGkmiQ3ZokCYrrJ0i9OHY9fqY7WK1UrtJjZQPyZ1K-kXmZpHg1Fly6T_cXLsufygMaOKUMsNrKCj1naEs2IYhvILaLVqgMpIArTX3lAI4-tLx42Vwk87SXPEffwkwPQbWx_kV4TaUWk1SATy7XhLRZs_MI-KqA_aJHnP1-hFXGrj-X-8JSw',
  },
] satisfies ReadonlyArray<VideoAsset>

export const liveQueueSequence = [
  {
    id: 'live-ethereal-highlands',
    title: 'Ethereal Highlands 4K',
    thumbnailUrl: videoLibrary[0].thumbnailUrl,
    status: 'playing',
    sourceVideoId: videoLibrary[0].id,
  },
  {
    id: 'live-cybernetic-flow-loop',
    title: 'Cybernetic Flow Loop',
    thumbnailUrl: videoLibrary[1].thumbnailUrl,
    status: 'upcoming',
    startsInMinutes: 12,
    sourceVideoId: videoLibrary[1].id,
  },
  {
    id: 'live-northern-lights-skyward',
    title: 'Northern Lights Skyward',
    thumbnailUrl: videoLibrary[2].thumbnailUrl,
    status: 'upcoming',
    startsInMinutes: 25,
    sourceVideoId: videoLibrary[2].id,
  },
  {
    id: 'live-alpine-reflection-8k',
    title: 'Alpine Reflection 8K',
    thumbnailUrl: videoLibrary[3].thumbnailUrl,
    status: 'upcoming',
    startsInMinutes: 34,
    sourceVideoId: videoLibrary[3].id,
  },
  {
    id: 'live-rainforest-canopy-drone',
    title: 'Rainforest Canopy Drone',
    thumbnailUrl: videoLibrary[4].thumbnailUrl,
    status: 'upcoming',
    startsInMinutes: 38,
    sourceVideoId: videoLibrary[4].id,
  },
] satisfies ReadonlyArray<LiveQueueItem>