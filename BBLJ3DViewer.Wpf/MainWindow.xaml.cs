using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;
using System.IO;

namespace BBLJ3DViewer.Wpf
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            this.LoadModels();
            this.InitializeWebViewAsync();
        }

        private void LoadModels()
        {
            List<string> models = new List<string>();
            DirectoryInfo gltfDir = new DirectoryInfo("Contents/Gltf");
            var fileInfos = gltfDir.GetFiles();
            foreach(var fileInfo in fileInfos)
            {
                models.Add("Gltf/"+fileInfo.Name);
            }
            var vm = this.DataContext as MainWindowViewModel;
            vm.Models = models;
        }

        async private void InitializeWebViewAsync()
        {
            await this.webview.EnsureCoreWebView2Async();
            this.webview.CoreWebView2.AddHostObjectToScript("vm",this.DataContext);
            this.webview.CoreWebView2.SetVirtualHostNameToFolderMapping("bblj3dviewer","Contents",Microsoft.Web.WebView2.Core.CoreWebView2HostResourceAccessKind.Allow);
            this.webview.Source = new Uri("https://bblj3dviewer/index.html");
        }

        private void button_Click(object sender, RoutedEventArgs e)
        {
            this.webview.ExecuteScriptAsync("reloadGLTFModel();");
        }
    }

    
    [ComVisible(true)]
    public class MainWindowViewModel : INotifyPropertyChanged
    {
        public event PropertyChangedEventHandler PropertyChanged;
        private void NotifyPropertyChanged([CallerMemberName] String propertyName = "")
        {
            if(PropertyChanged != null)
            {
                this.PropertyChanged(this, new PropertyChangedEventArgs(propertyName));
            }
        }
        public string IndexUri { get; } = $"https://bblj3dviewer/index.html";
        private string modelPath = "";
        public string ModelPath 
        { 
            get
            {
                return this.modelPath;
            }
            set
            {
                this.modelPath = value;
                this.NotifyPropertyChanged();
            }
        }
        private List<string> models = new List<string>();
        public List<string> Models 
        { 
            get
            {
                return this.models;
            }
            set
            {
                this.models = value;
                this.NotifyPropertyChanged();
            }
        }
    }
}
