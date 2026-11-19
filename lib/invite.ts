/** The WhatsApp/text message that goes with an invitation link. Used on server and client. */
export function inviteMessage(centre: string, role: string, link: string, child?: string) {
  const what = role === 'parent' ? `follow ${child ?? 'your child'}’s Quran reading and attendance` : `join as ${role === 'admin' ? 'an admin' : 'a teacher'}`
  return `Assalamualaikum. ${centre} has invited you to ${what} on Bintang Class. Open this link to join: ${link}`
}
